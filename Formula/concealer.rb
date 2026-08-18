# Homebrew formula for concealer.
#
# Bu dosyayi tap deposuna (github.com/fxerkan/homebrew-tap) Formula/concealer.rb
# olarak koyun. Kullanicilar:  brew install fxerkan/tap/concealer
#
# Yeni surumde guncelleme (PACKAGING.md'ye bakin):
#   1) git tag v0.3.0 && git push --tags
#   2) url'i tag'e gore ayarla, sonra:  shasum -a 256 <tarball>  → sha256'yi yapistir
class Concealer < Formula
  desc "Local-only, single-file secret manager over SOPS + age (CLI · Web UI · MCP)"
  homepage "https://github.com/fxerkan/concealer"
  url "https://github.com/fxerkan/concealer/archive/refs/tags/v0.3.0.tar.gz"
  sha256 "REPLACE_WITH_TARBALL_SHA256" # shasum -a 256 ile hesaplayin (PACKAGING.md)
  license "MIT"
  version "0.3.0"

  # Kullanici sops/age/expect'i AYRICA kurmak zorunda kalmasin — hepsi burada.
  depends_on "age"
  depends_on "expect"
  depends_on "sops"
  # macOS'ta python3 sistemde var; Linux/temiz kurulumda garanti icin:
  depends_on "python@3.13"

  def install
    libexec.install "concealer", "webui.html"
    (libexec/"concealer").chmod 0755
    bin.install_symlink libexec/"concealer"
    bin.install_symlink libexec/"concealer" => "cer" # kisa alias
  end

  def caveats
    <<~EOS
      Vault'unuz varsayilan olarak ~/.concealer altinda saklanir.
      Baslamak icin:
        concealer init          # master parola + recovery kodlari + CLI token uretir
        export CONCEALER_TOKEN=… # init ciktisindaki satiri calistirin
        concealer web 8787      # web arayuzu:  http://localhost:8787

      Detayli yardim ve ornekler:  concealer help
    EOS
  end

  test do
    assert_match "concealer #{version}", shell_output("#{bin}/concealer version")
    assert_match "USAGE", shell_output("#{bin}/concealer help")
    # bagimliliklar PATH'te olmali (brew bunlari kurar)
    %w[sops age age-keygen expect].each { |b| assert which(b), "#{b} PATH'te yok" }
  end
end
