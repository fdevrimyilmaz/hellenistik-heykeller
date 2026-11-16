import { useEffect, useState } from "react";
import {
  Image,
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
const storageKey = "hellenistic-mobile-records-v1";
const model = require("./research-model");
const options = model.records;
const catalogImages = require("./catalog-images");
const protocol = require("./research-protocol");
const iconography = require("./iconography-content");
function Action({ label, onPress, disabled = false }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={styles.selector}
    >
      <Text style={styles.selectorValue}>{label}</Text>
    </Pressable>
  );
}
function TabButton({ label, active, onPress }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.tabButton, active && styles.tabButtonActive]}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}
function Source({ record }) {
  return (
    <Action
      label="Müze kaynağını aç ↗"
      onPress={() => Linking.openURL(record.source).catch(() => {})}
    />
  );
}
function ArtworkImage({ record }) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const { width, height } = useWindowDimensions();
  const [plateWidth, setPlateWidth] = useState(Math.max(1, width - 76));
  const source = catalogImages[record.id] || { uri: record.image };
  const asset = Image.resolveAssetSource?.(source) || source;
  const ratio = asset?.width && asset?.height ? asset.width / asset.height : 0.7;
  const imageWidth = width * zoom;
  return (
    <>
      <Pressable onLayout={event => setPlateWidth(event.nativeEvent.layout.width)} accessibilityRole="button" accessibilityLabel={record.title + ': görseli tam ekran aç'} onPress={() => { setZoom(1); setOpen(true); }}>
        <Image source={source} accessibilityLabel={record.title} resizeMode="contain" style={{ width: '100%', height: plateWidth / ratio, backgroundColor: '#e9e7e1' }} />
        <Text style={styles.imageHint}>Tam ekran incelemek için dokunun ⤢</Text>
      </Pressable>
      <Modal visible={open} animationType="fade" presentationStyle="fullScreen" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.imageScreen}>
          <Text style={styles.imageTitle}>{record.title}</Text>
          <View style={styles.imageToolbar}>
            <Pressable accessibilityRole="button" accessibilityLabel="Görseli uzaklaştır" onPress={() => setZoom(z => Math.max(1, z / 1.5))} style={styles.imageControl}><Text>−</Text></Pressable>
            <Text style={styles.imageZoom}>{Math.round(zoom * 100)}%</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Görseli yakınlaştır" onPress={() => setZoom(z => Math.min(6, z * 1.5))} style={styles.imageControl}><Text>+</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Görsel boyutunu sıfırla" onPress={() => setZoom(1)} style={styles.imageControl}><Text>Sıfırla</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Görseli kapat" onPress={() => setOpen(false)} style={styles.imageControl}><Text>Kapat</Text></Pressable>
          </View>
          <Text style={styles.imageHelp}>+/− ile yakınlaştırın; ayrıntıları kaydırarak inceleyin.</Text>
          <ScrollView style={{ flex: 1 }} nestedScrollEnabled>
            <ScrollView horizontal nestedScrollEnabled contentContainerStyle={{ minWidth: width, minHeight: height - 180 }}>
              <Image source={source} accessibilityLabel={record.title + ' büyük görsel'} resizeMode="contain" style={{ width: imageWidth, height: imageWidth / ratio }} />
            </ScrollView>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

export default function App() {
  const [records, setRecords] = useState(() =>
    JSON.parse(JSON.stringify(model.records)),
  );
  const [storageReady, setStorageReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [iconographyText, setIconographyText] = useState("");
  const [styleText, setStyleText] = useState("");
  const [observations, setObservations] = useState({});
  useEffect(() => {
    AsyncStorage.getItem(storageKey).then(raw => {
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (Array.isArray(saved)) saved.forEach(r => { if (r?.features?.hair === "Bant ve topuz") r.features.hair = "Alın bandı + chignon"; });
      if (!Array.isArray(saved) || !saved.every(protocol.validateCatalogRecord)) throw Error('Invalid records');
      setRecords(current => current.map(seed => saved.find(r => r.id === seed.id && r.source === seed.source) || seed));
    }).catch(() => setMessage("Cihazdaki kayıtlar okunamadı.")).finally(() => setStorageReady(true));
  }, []);
  const [first, setFirst] = useState(options[0].id);
  const [second, setSecond] = useState(options[1].id);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [coder, setCoder] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("compare");
  const [filter, setFilter] = useState("Tümü");
  const [groupMode, setGroupMode] = useState("all");
  const sampleSummary = protocol.sampleSummary(records);
  const groupedPairs = protocol.comparisonPairs(records, groupMode);
  const a = records.find((r) => r.id === first),
    b = records.find((r) => r.id === second);
  const result = model.compare(a, b);
  const active = records.find((r) => r.id === selectedRecord);
  function cycle(current, setter) {
    const index = records.findIndex((r) => r.id === current);
    setter(records[(index + 1) % records.length].id);
  }
  function changeFeature(field) {
    const values = [null, ...field.options];
    const value =
      values[(values.indexOf(active.features[field.id]) + 1) % values.length];
    setRecords((current) =>
      current.map((r) =>
        r.id === active.id
          ? {
              ...r,
              features: { ...r.features, [field.id]: value },
              codingStatus: "Taslak; kaydedilmedi",
            }
          : r,
      ),
    );
  }
  async function saveCoding(textsOnly = false) {
    if (!active || !storageReady || saving) return;
    const complete = Boolean(coder.trim() && note.trim());
    const nextRecords = records.map(r => r.id === active.id ? {
      ...r, iconographyText, styleText, observations,
      ...(textsOnly ? {} : {
        coder: coder.trim(), codingNote: note.trim(), codedAt: new Date().toISOString(),
        codingStatus: complete
          ? "Araştırmacı kodlaması tamamlandı; bağımsız doğrulama yapılmadı"
          : "Taslak kaydedildi; kodlayıcı veya kaynak gerekçesi eksik"
      })
    } : r);
    setSaving(true);
    setMessage("Kaydediliyor…");
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(nextRecords));
      setRecords(nextRecords);
      setMessage(textsOnly
        ? "İkonografi, stil ve gözlemleriniz bu cihazda kaydedildi."
        : complete ? "Kodlama ve metinler bu cihazda kaydedildi."
        : "Taslak bu cihazda kaydedildi. Kodlamayı tamamlamak için kodlayıcı adı ve kaynak gerekçesini ekleyin.");
    } catch { setMessage("Kayıt yapılamadı. Metinler açık formda duruyor; yeniden deneyin."); }
    finally { setSaving(false); }
  }
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.brandMark}>
            <Text style={styles.brandLetter}>H</Text>
          </View>
          <View>
            <Text style={styles.brand}>hellenistik</Text>
            <Text style={styles.brandSub}>Apollon ve Afrodit</Text>
          </View>
        </View>
        <Text style={styles.hero}>
          Hellenistik Dönem{"\n"}Apollon ve Afrodit Heykelleri
        </Text>
        <Text style={styles.description}>
          Hellenistik Dönem’e (MÖ 323–31) tarihlenen Apollon ve Afrodit
          heykellerinin ikonografik ve biçimsel özelliklerinin kaynaklandırılmış
          katalog verileri üzerinden karşılaştırılmasına yönelik araştırma
          prototipi. Katalogda {records.length} eser bulunmaktadır. Özellikler
          araştırmacılar tarafından standartlaştırılmış kategorilerle kodlanır.
        </Text>
        <View style={styles.tabBar} accessibilityRole="tablist">
          <TabButton
            label="Karşılaştır"
            active={activeTab === "compare"}
            onPress={() => setActiveTab("compare")}
          />
          <TabButton
            label="Gruplu analiz"
            active={activeTab === "groups"}
            onPress={() => setActiveTab("groups")}
          />
          <TabButton
            label="Katalog"
            active={activeTab === "catalog"}
            onPress={() => setActiveTab("catalog")}
          />
        </View>
        {activeTab === "compare" ? (
          <>
        <Text style={styles.sectionHeading}>
          İkonografik ve biçimsel karşılaştırma
        </Text>
        <Action
          label={"Birinci eser: " + a.title}
          onPress={() => cycle(first, setFirst)}
        />
        <Action
          label={"İkinci eser: " + b.title}
          onPress={() => cycle(second, setSecond)}
        />
        <View style={styles.analysisCard}>
          <Text style={styles.analysisLabel}>
            {result.same
              ? "İki farklı eser seçin"
              : result.score === null
                ? "Benzerlik puanı için veri yetersiz"
                : result.score + " / 100 benzerlik"}
          </Text>
          <Text style={styles.analysisCopy}>
            {result.count} / {model.fields.length} alan karşılaştırılabilir ·
            veri kapsamı %{result.coverage}
          </Text>
          {result.groups.map((g) => (
            <Text key={g.name} style={styles.detailText}>
              {g.name}:{" "}
              {g.count && !result.same
                ? g.score + " / 100 (" + g.count + " alan; kısmi sonuç)"
                : "Değerlendirilemiyor"}
            </Text>
          ))}
        </View>
        <Action
          label={"Görünüm: " + filter}
          onPress={() => {
            const values = ["Tümü", "Ortak", "Farklı", "Bilinmiyor"];
            setFilter(values[(values.indexOf(filter) + 1) % values.length]);
          }}
        />
        {result.rows
          .filter((r) => filter === "Tümü" || r.status === filter)
          .map((r) => (
            <View key={r.id} style={styles.reportCard}>
              <Text style={styles.reportTitle}>
                {r.label} · {r.status}
              </Text>
              <Text style={styles.detailText}>
                {a.title}: {r.a ?? "Bilinmiyor / değerlendirilemiyor"}
              </Text>
              <Text style={styles.detailText}>
                {b.title}: {r.b ?? "Bilinmiyor / değerlendirilemiyor"}
              </Text>
            </View>
          ))}
        <Text style={styles.detailText}>
          Puan = ortak / karşılaştırılabilir özellik × 100. Bilinmeyenler hesaba
          katılmaz. Toplam puan için en az 3 karşılaştırılabilir alan gerekir.
          Bu asgari veri eşiği uzman değerlendirmesiyle sınanmalıdır; sayısal
          benzerlik tek başına tarihsel etkileşim kanıtı değildir.
        </Text>
          </>
        ) : null}
        {activeTab === "groups" ? (
          <>
        <Text style={styles.sectionHeading}>
          Tanrı kimliğine göre gruplu analiz
        </Text>
        <Text style={styles.detailText}>
          Örnekleme kabul edilen: {sampleSummary.total} eser; Apollon{" "}
          {sampleSummary.apollon}, Afrodit {sampleSummary.afrodit}.           Hedef toplam
          10–15; tanrı başına 5–8, toplam en fazla 15. Künye/referans kayıtları
          örneklem sayısına katılmaz. Aşağıdaki otomatik karşılaştırma,
          kaynaklandırılmış katalog kayıtlarını ayrıca gösterir.
        </Text>
        <Action
          label={
            "Grup: " +
            {
              all: "Tümü",
              apollo: "Apollon–Apollon",
              aphrodite: "Afrodit–Afrodit",
              cross: "Apollon–Afrodit",
            }[groupMode]
          }
          onPress={() => {
            const groups = ["all", "apollo", "aphrodite", "cross"];
            setGroupMode(
              groups[(groups.indexOf(groupMode) + 1) % groups.length],
            );
          }}
        />
        {groupedPairs.length ? (
          groupedPairs.map((pair) => (
            <View
              key={pair.first + "-" + pair.second}
              style={styles.reportCard}
            >
              <Text style={styles.reportTitle}>
                {pair.firstTitle} / {pair.secondTitle}
              </Text>
              <Text style={styles.detailText}>
                {pair.score === null
                  ? "Benzerlik puanı için veri yetersiz"
                  : pair.score + " / 100"}{" "}
                · veri kapsamı %{pair.coverage}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.detailText}>
            Seçili grupta karşılaştırılabilir en az iki katalog kaydı gereklidir.
            Araştırma örneklemi ve bağımsız kodlayıcı dosyaları ayrıca yönetilir.
            Web ve mobil kayıtlar otomatik eşitlenmez.
          </Text>
        )}
        </>
        ) : null}
        {activeTab === "catalog" ? (
        <>
        <Text style={styles.sectionHeading}>Kaynaklandırılmış katalog</Text>
        {records.map((r) => (
          <View key={r.id} style={styles.reportCard}>
            {r.image ? (
              <ArtworkImage record={r} />
            ) : null}
            <Text style={styles.cardTitle}>{r.title}</Text>
            <Text style={styles.detailText}>
              {r.date} · {r.museum}
            </Text>
            <Text style={styles.detailText}>{r.preservation}</Text>
            <Text style={styles.detailText}>{r.codingStatus}</Text>
            <Source record={r} />
            <Action
              label="Eser fişi ve elle kodlama"
              disabled={!storageReady}
              onPress={() => {
                setSelectedRecord(r.id);
                setCoder(r.coder || "");
                setNote(r.codingNote || "");
                setIconographyText(r.iconographyText ?? iconography[r.id]?.paragraphs.join("\n\n") ?? "");
                setStyleText(r.styleText ?? iconography[r.id]?.styleParagraphs?.join("\n\n") ?? "");
                setObservations(r.observations || {});
                setMessage("");
              }}
            />
          </View>
        ))}
        </>
        ) : null}
        <Text style={styles.sectionHeading}>Bilimsel değerlendirme</Text>
        <Text style={styles.detailText}>
          Bağımsız değerlendiriciler arası uyum ölçümü ve uzman değerlendirmesi
          henüz gerçekleştirilmemiştir. Öğrenme kazanımları üzerindeki etkinin
          ölçülmesi mevcut araştırmanın kapsamı dışındadır. Klasik Dönem
          tarihsel arka plan olarak ele alınır; Roma Dönemi kopyaları araştırma
          örneklemine dahil edilmez.
        </Text>
      </ScrollView>
      <Modal
        visible={Boolean(active)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedRecord(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <ScrollView keyboardShouldPersistTaps="handled">
              {active ? (
                <>
                  <Action
                    label="Kapat"
                    onPress={() => setSelectedRecord(null)}
                  />
                  <Text style={styles.modalTitle}>{active.title}</Text>
                  {[
                    ["Kayıt statüsü", protocol.roles[protocol.role(active)]],
                    ["Korunan nesnenin tarihi", active.date],
                    [
                      "Önerilen prototip tarihi",
                      active.prototypeDate || "Belirtilmemiş",
                    ],
                    [
                      "Tarihlendirme dayanağı",
                      active.datingConfidence || "Belirtilmemiş",
                    ],
                    [
                      "Bilimsel kaynakça",
                      active.bibliography || "Tamamlanmalı",
                    ],
                    ["Envanter", active.inventory],
                    ["Buluntu / bağlam", active.findspot],
                    ["Malzeme", active.material],
                    ["Ölçüler", active.dimensions],
                    ["Korunma", active.preservation],
                    ["Kaynak notu", active.sourceNote],
                    ["Görsel lisansı", active.license],
                    ["Görsel kredisi", active.imageCredit || "Belirtilmemiş"],
                    ["Görsel kaynağı", active.imageSource || active.source],
                    ["Kültür", active.culture || "Belirtilmemiş"],
                    ["Edinim / bağış", active.creditLine || "Belirtilmemiş"],
                  ].map(([key, value]) => (
                    <View key={key}>
                      <Text style={styles.detailHeading}>{key}</Text>
                      <Text style={styles.detailText}>{value}</Text>
                    </View>
                  ))}
                  <Text style={styles.detailHeading}>İkonografi</Text>
                  <TextInput accessibilityLabel="İkonografi metni" value={iconographyText} onChangeText={setIconographyText} multiline textAlignVertical="top" placeholder="İkonografik değerlendirmenizi yazın…" style={styles.writingArea} />
                  <Text style={styles.detailHeading}>Stil</Text>
                  <TextInput accessibilityLabel="Stil metni" value={styleText} onChangeText={setStyleText} multiline textAlignVertical="top" placeholder="Stil değerlendirmenizi yazın…" style={styles.writingArea} />
                  <Text style={styles.detailText}>Metinler ve alan gözlemleri serbestçe düzenlenebilir. Kaydettiğiniz metinler bu cihazda saklanır.</Text>
                  <Action label={saving ? "Kaydediliyor…" : "Metinleri kaydet"} disabled={saving} onPress={() => saveCoding(true)} />
                  <Source record={active} />
                  <Text style={styles.detailHeading}>Elle kodlama</Text>
                  <Text style={styles.detailText}>Her özellik için kendi gözleminizi yazabilirsiniz. Karşılaştırma için standart kategoriyi ayrıca seçin. Korunmayan özellikleri bilinmiyor bırakın.</Text>
                  {model.fields.map((f) => (
                    <View key={f.id}>
                      <Action label={f.label + ": " + (active.features[f.id] ?? "Bilinmiyor / değerlendirilemiyor")} onPress={() => changeFeature(f)} />
                      <TextInput accessibilityLabel={f.label + " gözlemi"} value={observations[f.id] || ""} onChangeText={text => setObservations(current => ({...current, [f.id]: text}))} multiline textAlignVertical="top" placeholder={f.label + " hakkında kendi gözleminizi yazın…"} style={styles.observationArea} />
                    </View>
                  ))}
                  <Text style={styles.detailHeading}>Kodlayıcı adı</Text>
                  <TextInput
                    accessibilityLabel="Kodlayıcı adı"
                    value={coder}
                    onChangeText={setCoder}
                    maxLength={100}
                    style={styles.selector}
                  />
                  <Text style={styles.detailHeading}>
                    Kaynak / sayfa ve gerekçe
                  </Text>
                  <TextInput
                    accessibilityLabel="Kaynak ve kodlama gerekçesi"
                    value={note}
                    onChangeText={setNote}
                    multiline
                    maxLength={3000}
                    style={styles.selector}
                  />
                  <Action
                    label={saving ? "Kaydediliyor…" : "Kodlamayı kaydet"}
                    disabled={saving}
                    onPress={() => saveCoding(false)}
                  />
                  <Text
                    accessibilityLiveRegion="polite"
                    style={styles.detailText}
                  >
                    {message}
                  </Text>
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  writingArea: { minHeight: 180, borderWidth: 1, borderColor: "#c8d6d8", borderRadius: 10, padding: 14, fontSize: 15, lineHeight: 24, backgroundColor: "#fbfdfc", marginTop: 12, color: "#183b4a" },
  observationArea: { minHeight: 85, borderWidth: 1, borderColor: "#d4dfe0", borderRadius: 8, padding: 12, fontSize: 14, lineHeight: 22, marginBottom: 15, backgroundColor: "#fbfdfc", color: "#183b4a" },
  iconographyText: { color: "#315563", fontSize: 15, lineHeight: 25, marginTop: 14 },
  imageScreen: { flex: 1, backgroundColor: "#102d3d" },
  imageTitle: { color: "#fff", fontSize: 19, padding: 16, fontWeight: "700" },
  imageToolbar: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, alignItems: "center" },
  imageControl: { backgroundColor: "#fff", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, minHeight: 44 },
  imageZoom: { color: "#fff", minWidth: 43, textAlign: "center", fontWeight: "700" },
  imageHelp: { color: "#c9dce1", fontSize: 12, padding: 16 },
  imageHint: { color: "#32616a", backgroundColor: "#eaf3f1", padding: 13, textAlign: "center", marginBottom: 16, fontSize: 12, fontWeight: "600" },
  safeArea: { flex: 1, backgroundColor: "#eef3f2" },
  container: { padding: 20, paddingBottom: 64, maxWidth: 1120, width: "100%", alignSelf: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 22,
    marginBottom: 24,
    borderRadius: 16,
    backgroundColor: "#102d3d",
    shadowColor: "#102d3d",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 5,
  },
  brandMark: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#c49a5a",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },
  brandLetter: { color: "#102d3d", fontSize: 23, fontWeight: "800", fontFamily: "serif" },
  brand: { fontWeight: "800", color: "#fff", fontSize: 18, letterSpacing: 0.3 },
  brandSub: { color: "#c9d9d8", fontSize: 10, letterSpacing: 1.2, marginTop: 4, textTransform: "uppercase" },
  avatar: {
    marginLeft: "auto",
    backgroundColor: "#4a6374",
    color: "#fff",
    borderRadius: 16,
    padding: 8,
    fontSize: 9,
    fontWeight: "700",
  },
  eyebrow: {
    color: "#6d8589",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  eyebrowAccent: {
    color: "#b47d32",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.3,
  },
  hero: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: "800",
    marginTop: 4,
    color: "#102d3d",
    fontFamily: "serif",
  },
  heroAccent: { color: "#b47d32" },
  description: {
    color: "#5c7478",
    fontSize: 13,
    lineHeight: 21,
    marginTop: 16,
    marginBottom: 34,
    maxWidth: 800,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#e5eeec",
    borderRadius: 12,
    padding: 4,
    marginBottom: 22,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 6,
    borderRadius: 9,
  },
  tabButtonActive: {
    backgroundColor: "#102d3d",
    shadowColor: "#102d3d",
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabText: {
    color: "#5c7478",
    fontSize: 11,
    fontWeight: "700",
  },
  tabTextActive: {
    color: "#fff",
  },
  sectionTitle: { marginBottom: 14 },
  sectionHeading: {
    color: "#173b4a",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 7,
    marginBottom: 12,
    fontFamily: "serif",
  },
  heroCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e8e7e4",
    marginBottom: 34,
  },
  heroImage: { width: "100%", height: 310, resizeMode: "cover" },
  heroCardContent: { padding: 17 },
  cardTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#20232a",
    fontFamily: "serif",
    marginTop: 8,
  },
  muted: { color: "#71888b", fontSize: 11, marginTop: 6 },
  cardDescription: {
    color: "#858983",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 14,
  },
  linkText: {
    color: "#a66f28",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 14,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  score: {
    color: "#a66f28",
    fontSize: 27,
    fontWeight: "700",
    fontFamily: "serif",
  },
  analysisCard: { backgroundColor: "#dcebea", padding: 20, marginBottom: 28, borderRadius: 14, borderLeftWidth: 4, borderLeftColor: "#b47d32" },
  analysisLabel: {
    color: "#173b4a",
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "serif",
  },
  analysisCopy: {
    color: "#5f777b",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 8,
    marginBottom: 18,
  },
  selector: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#cbd9da",
    borderRadius: 10,
    padding: 14,
    marginTop: 10,
    shadowColor: "#173b4a",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  selectorLabel: {
    color: "#6d8589",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1,
  },
  selectorValue: {
    color: "#173b4a",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 5,
  },
  catalogHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e8e7e4",
    padding: 12,
    marginBottom: 10,
  },
  statusLoading: { borderColor: "#efd4ca" },
  statusText: { color: "#777871", fontSize: 10, flex: 1, lineHeight: 15 },
  recordCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e8e7e4",
    marginBottom: 10,
    overflow: "hidden",
  },
  recordImage: { width: 96, height: 96, backgroundColor: "#e9e7e1" },
  recordImagePlaceholder: { width: 96, height: 96, backgroundColor: "#e9e7e1" },
  recordContent: { padding: 12, flex: 1 },
  recordTitle: {
    color: "#20232a",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "serif",
  },
  license: { color: "#668170", fontSize: 8, fontWeight: "700", marginTop: 10 },
  reportCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d9e3e2",
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    shadowColor: "#173b4a",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  reportTitle: {
    color: "#173b4a",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "serif",
    marginTop: 7,
  },
  reportText: {
    color: "#5f777b",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
    marginBottom: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#102d3dcc",
    justifyContent: "flex-end",
  },
  modal: {
    maxHeight: "94%",
    backgroundColor: "#fff",
    padding: 24,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  close: {
    position: "absolute",
    right: 16,
    top: 10,
    zIndex: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#173b4a",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { color: "#fff", fontSize: 24, lineHeight: 25 },
  modalImage: {
    width: "100%",
    height: 280,
    resizeMode: "cover",
    marginBottom: 18,
  },
  modalTitle: {
    color: "#173b4a",
    fontSize: 30,
    fontWeight: "800",
    fontFamily: "serif",
    marginTop: 8,
  },
  detailHeading: {
    color: "#173b4a",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "serif",
    marginTop: 22,
  },
  detailText: { color: "#5f777b", fontSize: 12, lineHeight: 20, marginTop: 7 },
  sourceButton: {
    backgroundColor: "#a66f28",
    padding: 15,
    borderRadius: 10,
    marginTop: 24,
    marginBottom: 8,
    alignItems: "center",
  },
  sourceButtonText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
