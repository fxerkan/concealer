package org.concealer.mobile;

import android.content.Context;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.net.wifi.WifiManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.net.InetAddress;
import java.util.ArrayDeque;
import java.util.Map;
import java.util.Queue;

/**
 * Native mDNS discovery via Android's NsdManager — more reliable than JmDNS for browsing
 * _concealer._tcp on real Wi-Fi. Emits a "discover" event per resolved/lost service.
 */
@CapacitorPlugin(name = "ConcealerDiscovery")
public class DiscoveryPlugin extends Plugin {
    private static final String SERVICE_TYPE = "_concealer._tcp.";
    private NsdManager nsd;
    private NsdManager.DiscoveryListener discoveryListener;
    private WifiManager.MulticastLock lock;

    // NsdManager (pre-Android 12) allows only one active resolve at a time — serialize them.
    private final Queue<NsdServiceInfo> resolveQueue = new ArrayDeque<>();
    private boolean resolving = false;

    @PluginMethod
    public void watch(PluginCall call) {
        Context ctx = getContext();
        if (nsd == null) nsd = (NsdManager) ctx.getSystemService(Context.NSD_SERVICE);
        try {
            WifiManager wifi = (WifiManager) ctx.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            if (wifi != null) { lock = wifi.createMulticastLock("concealer-nsd"); lock.setReferenceCounted(false); lock.acquire(); }
        } catch (Exception ignored) {}
        stop();
        discoveryListener = new NsdManager.DiscoveryListener() {
            @Override public void onStartDiscoveryFailed(String t, int e) {}
            @Override public void onStopDiscoveryFailed(String t, int e) {}
            @Override public void onDiscoveryStarted(String t) {}
            @Override public void onDiscoveryStopped(String t) {}
            @Override public void onServiceFound(NsdServiceInfo info) { enqueueResolve(info); }
            @Override public void onServiceLost(NsdServiceInfo info) {
                JSObject o = new JSObject(); o.put("action", "removed"); o.put("name", info.getServiceName());
                notifyListeners("discover", o);
            }
        };
        try { nsd.discoverServices(SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, discoveryListener); }
        catch (Exception e) { call.reject(e.getMessage()); return; }
        call.resolve();
    }

    private synchronized void enqueueResolve(NsdServiceInfo info) {
        resolveQueue.add(info);
        if (!resolving) resolveNext();
    }

    private synchronized void resolveNext() {
        NsdServiceInfo info = resolveQueue.poll();
        if (info == null) { resolving = false; return; }
        resolving = true;
        try {
            nsd.resolveService(info, new NsdManager.ResolveListener() {
                @Override public void onResolveFailed(NsdServiceInfo i, int e) { resolveNext(); }
                @Override public void onServiceResolved(NsdServiceInfo i) {
                    JSObject o = new JSObject();
                    o.put("action", "resolved");
                    o.put("name", i.getServiceName());
                    o.put("port", i.getPort());
                    InetAddress host = i.getHost();
                    o.put("ip", host != null ? host.getHostAddress() : null);
                    JSObject txt = new JSObject();
                    Map<String, byte[]> attrs = i.getAttributes();
                    if (attrs != null) for (Map.Entry<String, byte[]> en : attrs.entrySet())
                        txt.put(en.getKey(), en.getValue() != null ? new String(en.getValue()) : "");
                    o.put("txt", txt);
                    notifyListeners("discover", o);
                    resolveNext();
                }
            });
        } catch (Exception e) { resolveNext(); }
    }

    @PluginMethod
    public void unwatch(PluginCall call) { stop(); call.resolve(); }

    private synchronized void stop() {
        if (nsd != null && discoveryListener != null) {
            try { nsd.stopServiceDiscovery(discoveryListener); } catch (Exception ignored) {}
            discoveryListener = null;
        }
        resolveQueue.clear(); resolving = false;
        if (lock != null && lock.isHeld()) { try { lock.release(); } catch (Exception ignored) {} }
        lock = null;
    }
}
