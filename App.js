import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import ResearchScreen from './ResearchScreen';
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Linking,
  Modal,
  Pressable,
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
const { visibleCatalog } = require('./catalog-presentation');
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
  const displayRecords = useMemo(() => visibleCatalog(records), [records]);
  const [saving, setSaving] = useState(false);
  const [iconographyText, setIconographyText] = useState("");
  const [styleText, setStyleText] = useState("");
  const [bibliography, setBibliography] = useState("");
  const [observations, setObservations] = useState({});
  useEffect(() => {
    AsyncStorage.getItem(storageKey).then(async raw => {
      if (!raw) return;
      const saved = JSON.parse(raw, protocol.omitCoderName);
      if (Array.isArray(saved)) saved.forEach(r => { if (r?.features?.hair === "Bant ve topuz") r.features.hair = "Alın bandı + chignon"; });
      if (!Array.isArray(saved) || !saved.every(protocol.validateCatalogRecord)) throw Error('Invalid records');
      await AsyncStorage.setItem(storageKey, JSON.stringify(saved, protocol.omitCoderName));
      setRecords(current => current.map(seed => saved.find(r => r.id === seed.id && r.source === seed.source) || seed));
    }).catch(() => setMessage("Cihazdaki kayıtlar okunamadı.")).finally(() => setStorageReady(true));
  }, []);
  const [first, setFirst] = useState(options[0].id);
  const [second, setSecond] = useState(options[1].id);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const { tab } = useLocalSearchParams();
  const activeTab = ['compare', 'groups', 'catalog'].includes(tab) ? tab : 'compare';
  function setActiveTab(next) { router.setParams({ tab: next }); }
  function openEditor(record) {
    setSelectedRecord(record.id);
    setNote(record.codingNote || '');
    setBibliography(record.bibliography || '');
    setIconographyText(record.iconographyText ?? iconography[record.id]?.paragraphs.join('\n\n') ?? '');
    setStyleText(record.styleText ?? iconography[record.id]?.styleParagraphs?.join('\n\n') ?? '');
    setObservations(record.observations || {}); setMessage('');
  }
  const active = records.find((r) => r.id === selectedRecord);
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
              verificationState: 'draft',
              verifiedAt: null,
            }
          : r,
      ),
    );
  }
  async function saveCoding(textsOnly = false) {
    if (!active || !storageReady || saving) return;
    const edited = {...active, iconographyText, styleText, bibliography: bibliography.trim(), observations, codingNote: note.trim()};
    const missing = protocol.missingCompletionFields(edited);
    const complete = missing.length === 0;
    const nextRecords = records.map(r => r.id === active.id ? {
      ...r, ...edited,
      verificationState: complete ? 'verified' : 'draft',
      verifiedAt: complete ? new Date().toISOString() : null,
      verificationBasis: 'Araştırmacının doldurduğu kayıt alanlarının tamamlığı',
      ...(textsOnly ? {} : {
        codingNote: note.trim(), codedAt: new Date().toISOString(),
        codingStatus: complete
          ? "Doğrulandı"
          : "Taslak kaydedildi; eksik alanlar: " + missing.join(', ')
      })
    } : r);
    setSaving(true);
    setMessage("Kaydediliyor…");
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(nextRecords, protocol.omitCoderName));
      setRecords(nextRecords);
      setMessage(textsOnly
        ? complete ? "Doğrulandı. Tüm alanlar bu cihazda kaydedildi." : "İkonografi, stil ve gözlemleriniz bu cihazda kaydedildi."
        : complete ? "Doğrulandı. Tüm alanlar bu cihazda kaydedildi."
        : "Taslak kaydedildi. Eksik alanlar: " + missing.join(', '));
    } catch { setMessage("Kayıt yapılamadı. Metinler açık formda duruyor; yeniden deneyin."); }
    finally { setSaving(false); }
  }
  return (
    <SafeAreaView style={styles.safeArea}>
      <ResearchScreen records={displayRecords} activeTab={activeTab} onTab={setActiveTab} first={first} second={second} onFirst={setFirst} onSecond={setSecond} onEdit={openEditor} storageReady={storageReady} ArtworkImage={ArtworkImage} Source={Source} />
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
                    ["Kayıt statüsü", protocol.completionLabel(active)],
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
                  <Text style={styles.detailHeading}>Kaynakça</Text>
                  <TextInput accessibilityLabel="Kaynakça" value={bibliography} onChangeText={setBibliography} multiline textAlignVertical="top" style={styles.writingArea} />
                  <Text style={styles.detailText}>Kaynakça, ikonografi, stil, kaynak gerekçesi ve sekiz özellik tamamlanıp kaydedildiğinde durum Doğrulandı olur. Korunmayan bir özelliği bilinmiyor bırakıp gözlem alanında gerekçesini yazabilirsiniz.</Text>
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
  writingArea: { minHeight: 180, borderWidth: 1, borderColor: "#c8d6d8", borderRadius: 10, padding: 14, fontSize: 15, lineHeight: 24, backgroundColor: "#FFFDF9", marginTop: 12, color: "#183b4a" },
  observationArea: { minHeight: 85, borderWidth: 1, borderColor: "#d4dfe0", borderRadius: 8, padding: 12, fontSize: 14, lineHeight: 22, marginBottom: 15, backgroundColor: "#FFFDF9", color: "#183b4a" },
  iconographyText: { color: "#315563", fontSize: 15, lineHeight: 25, marginTop: 14 },
  imageScreen: { flex: 1, backgroundColor: "#142838" },
  imageTitle: { color: "#fff", fontSize: 19, padding: 16, fontWeight: "700" },
  imageToolbar: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, alignItems: "center" },
  imageControl: { backgroundColor: "#fff", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, minHeight: 44 },
  imageZoom: { color: "#fff", minWidth: 43, textAlign: "center", fontWeight: "700" },
  imageHelp: { color: "#c9dce1", fontSize: 12, padding: 16 },
  imageHint: { color: "#32616a", backgroundColor: "#eaf3f1", padding: 13, textAlign: "center", marginBottom: 16, fontSize: 12, fontWeight: "600" },
  safeArea: { flex: 1, backgroundColor: "#FAF6EE" },
  container: { padding: 20, paddingBottom: 64, maxWidth: 1120, width: "100%", alignSelf: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 22,
    marginBottom: 24,
    borderRadius: 16,
    backgroundColor: "#142838",
    shadowColor: "#142838",
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
  brandLetter: { color: "#142838", fontSize: 23, fontWeight: "800", fontFamily: "serif" },
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
    color: "#142838",
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
    backgroundColor: "#142838",
    shadowColor: "#142838",
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
    color: "#142838",
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
    color: "#142838",
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "serif",
  },
  analysisCopy: {
    color: "#625646",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 8,
    marginBottom: 18,
  },
  selector: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2D7C5",
    borderRadius: 10,
    padding: 14,
    marginTop: 10,
    shadowColor: "#142838",
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
    color: "#142838",
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
    shadowColor: "#142838",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  reportTitle: {
    color: "#142838",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "serif",
    marginTop: 7,
  },
  reportText: {
    color: "#625646",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
    marginBottom: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#142838cc",
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
    backgroundColor: "#142838",
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
    color: "#142838",
    fontSize: 30,
    fontWeight: "800",
    fontFamily: "serif",
    marginTop: 8,
  },
  detailHeading: {
    color: "#142838",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "serif",
    marginTop: 22,
  },
  detailText: { color: "#625646", fontSize: 12, lineHeight: 20, marginTop: 7 },
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
