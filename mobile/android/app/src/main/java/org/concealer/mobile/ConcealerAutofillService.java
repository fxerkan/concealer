package org.concealer.mobile;

import android.app.PendingIntent;
import android.app.assist.AssistStructure;
import android.app.assist.AssistStructure.ViewNode;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.CancellationSignal;
import android.service.autofill.AutofillService;
import android.service.autofill.Dataset;
import android.service.autofill.FillCallback;
import android.service.autofill.FillContext;
import android.service.autofill.FillRequest;
import android.service.autofill.FillResponse;
import android.service.autofill.SaveCallback;
import android.service.autofill.SaveInfo;
import android.service.autofill.SaveRequest;
import android.text.InputType;
import android.util.Pair;
import android.view.View;
import android.view.ViewStructure.HtmlInfo;
import android.view.autofill.AutofillId;
import android.widget.RemoteViews;

import androidx.annotation.RequiresApi;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * System autofill service. It never holds vault data: a fill request gets one locked dataset
 * ("Fill with concealer") whose authentication opens AutofillActivity, where the user unlocks the
 * vault and picks a sign-in; a save request opens the same activity with a prefilled login form.
 */
@RequiresApi(api = Build.VERSION_CODES.O)
public class ConcealerAutofillService extends AutofillService {
    // Sign-in captured by onSaveRequest, handed to AutofillActivity in-process (never via the
    // Intent, so the password doesn't sit in the system's pending-intent records). Read once.
    private static String[] pendingSave;

    static synchronized String[] takeSave() { String[] s = pendingSave; pendingSave = null; return s; }

    static RemoteViews item(Context ctx, String text) {
        RemoteViews rv = new RemoteViews(ctx.getPackageName(), R.layout.autofill_item);
        rv.setTextViewText(R.id.autofill_text, text);
        return rv;
    }

    /** The sign-in fields of one screen (web pages report their domain, apps their package). */
    static class Form {
        AutofillId user, pass, lastText;
        String userValue, passValue, domain = "";
    }

    @Override
    public void onFillRequest(FillRequest request, CancellationSignal cancel, FillCallback cb) {
        List<FillContext> ctxs = request.getFillContexts();
        AssistStructure st = ctxs.get(ctxs.size() - 1).getStructure();
        String pkg = st.getActivityComponent().getPackageName();
        if (pkg.equals(getPackageName())) { cb.onSuccess(null); return; }   // never fill concealer itself
        Form f = parse(st);
        if (f.user == null && f.pass == null) { cb.onSuccess(null); return; }

        Intent i = new Intent(this, AutofillActivity.class)
            .putExtra("mode", "fill").putExtra("domain", f.domain).putExtra("pkg", pkg)
            .putExtra("user", f.user).putExtra("pass", f.pass);
        // MUTABLE: the framework adds the assist structure to the intent when it launches it
        int flags = PendingIntent.FLAG_CANCEL_CURRENT | (Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0);
        PendingIntent pi = PendingIntent.getActivity(this, (int) System.nanoTime(), i, flags);

        Dataset.Builder db = new Dataset.Builder(item(this, "Fill with concealer"));
        List<AutofillId> ids = new ArrayList<>();
        if (f.user != null) ids.add(f.user);
        if (f.pass != null) ids.add(f.pass);
        for (AutofillId id : ids) db.setValue(id, null);
        db.setAuthentication(pi.getIntentSender());

        FillResponse.Builder rb = new FillResponse.Builder().addDataset(db.build());
        if (f.pass != null) {
            int type = SaveInfo.SAVE_DATA_TYPE_PASSWORD | (f.user != null ? SaveInfo.SAVE_DATA_TYPE_USERNAME : 0);
            rb.setSaveInfo(new SaveInfo.Builder(type, ids.toArray(new AutofillId[0])).build());
        }
        cb.onSuccess(rb.build());
    }

    @Override
    public void onSaveRequest(SaveRequest request, SaveCallback cb) {
        // multi-step sign-ins (username screen, then password screen) arrive as several contexts
        String domain = "", user = null, pass = null, pkg = "";
        for (FillContext c : request.getFillContexts()) {
            AssistStructure st = c.getStructure();
            pkg = st.getActivityComponent().getPackageName();
            Form f = parse(st);
            if (!f.domain.isEmpty()) domain = f.domain;
            if (f.userValue != null && !f.userValue.isEmpty()) user = f.userValue;
            if (f.passValue != null && !f.passValue.isEmpty()) pass = f.passValue;
        }
        if (pass == null || pkg.equals(getPackageName())) { cb.onSuccess(); return; }
        synchronized (ConcealerAutofillService.class) { pendingSave = new String[]{domain, pkg, user == null ? "" : user, pass}; }
        Intent i = new Intent(this, AutofillActivity.class).putExtra("mode", "save");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            PendingIntent pi = PendingIntent.getActivity(this, (int) System.nanoTime(), i,
                PendingIntent.FLAG_CANCEL_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            cb.onSuccess(pi.getIntentSender());
        } else {
            startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            cb.onSuccess();
        }
    }

    static Form parse(AssistStructure st) {
        Form f = new Form();
        for (int w = 0; w < st.getWindowNodeCount(); w++) walk(st.getWindowNodeAt(w).getRootViewNode(), f);
        if (f.pass != null && f.user == null && f.lastText != null) f.user = f.lastText;
        return f;
    }

    private static void walk(ViewNode n, Form f) {
        if (n.getWebDomain() != null && f.domain.isEmpty()) f.domain = n.getWebDomain();
        AutofillId id = n.getAutofillId();
        if (id != null && n.getAutofillType() == View.AUTOFILL_TYPE_TEXT) {
            String kind = kind(n), val = n.getAutofillValue() != null && n.getAutofillValue().isText()
                ? n.getAutofillValue().getTextValue().toString() : null;
            if ("pass".equals(kind)) {
                if (f.pass == null) { f.pass = id; f.passValue = val; }
            } else if (f.pass == null) {   // a text box before the password box: candidate username
                if ("user".equals(kind) && f.user == null) { f.user = id; f.userValue = val; }
                f.lastText = id;
                if (f.user == null && val != null) f.userValue = val;
            }
        }
        for (int c = 0; c < n.getChildCount(); c++) walk(n.getChildAt(c), f);
    }

    // ponytail: heuristic field classification (hints → input type → HTML attrs → id/hint text);
    // add per-site rules only if real forms are missed.
    private static String kind(ViewNode n) {
        String[] hints = n.getAutofillHints();
        if (hints != null) for (String h : hints) {
            String l = h.toLowerCase(Locale.ROOT);
            if (l.contains("password")) return "pass";
            if (l.contains("user") || l.contains("email") || l.contains("login") || l.contains("phone")) return "user";
        }
        int t = n.getInputType(), v = t & InputType.TYPE_MASK_VARIATION;
        if ((t & InputType.TYPE_MASK_CLASS) == InputType.TYPE_CLASS_TEXT) {
            if (v == InputType.TYPE_TEXT_VARIATION_PASSWORD || v == InputType.TYPE_TEXT_VARIATION_WEB_PASSWORD
                || v == InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD) return "pass";
            if (v == InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS || v == InputType.TYPE_TEXT_VARIATION_WEB_EMAIL_ADDRESS) return "user";
        }
        StringBuilder s = new StringBuilder();
        HtmlInfo h = n.getHtmlInfo();
        if (h != null && h.getAttributes() != null) for (Pair<String, String> a : h.getAttributes()) {
            if ("type".equals(a.first) && "password".equalsIgnoreCase(a.second)) return "pass";
            if ("type".equals(a.first) && "email".equalsIgnoreCase(a.second)) return "user";
            if ("name".equals(a.first) || "id".equals(a.first) || "autocomplete".equals(a.first)) s.append(' ').append(a.second);
        }
        if (n.getIdEntry() != null) s.append(' ').append(n.getIdEntry());
        if (n.getHint() != null) s.append(' ').append(n.getHint());
        String l = s.toString().toLowerCase(Locale.ROOT);
        if (l.matches("(?s).*(pass|parola|şifre|sifre).*")) return "pass";
        if (l.matches("(?s).*(user|email|e-mail|login|account|kullan|phone).*")) return "user";
        return null;
    }
}
