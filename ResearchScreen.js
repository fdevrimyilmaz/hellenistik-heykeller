import { useMemo, useState } from 'react';
import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArtifactDetails from './ArtifactDetails';

const model = require('./research-model');
const protocol = require('./research-protocol');
const catalogImages = require('./catalog-images');
const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' });
const tabs = [{id:'compare',label:'Karşılaştırma',icon:'⇄'}, {id:'groups',label:'Gruplu Analiz',icon:'▦'}, {id:'catalog',label:'Eser Fişi',icon:'▤'}];
const groupNames = { all:'Tümü', apollo:'Apollon–Apollon', aphrodite:'Afrodit–Afrodit', cross:'Apollon–Afrodit' };

function Button({ label, onPress, primary = false, disabled = false }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={[s.button,primary && s.primary,disabled && s.disabled]}><Text style={[s.buttonText,primary && s.white]}>{label}</Text></Pressable>;
}
function Pill({ label, selected, onPress }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[s.pill,selected && s.pillSelected]}><Text style={[s.pillText,selected && s.white]}>{label}</Text></Pressable>;
}
function Sheet({ title, visible, onClose, children }) {
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={s.backdrop}><SafeAreaView edges={['bottom']} style={s.sheet} accessibilityViewIsModal>
      <View style={s.sheetHeader}><Text accessibilityRole="header" style={s.sheetTitle}>{title}</Text><Button label="Kapat" onPress={onClose}/></View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.sheetContent}>{children}</ScrollView>
    </SafeAreaView></View>
  </Modal>;
}
function Badge({ subject }) {
  return <Text style={[s.badge,subject === 'Apollon' ? s.apollo : s.aphrodite]}>{subject}</Text>;
}

export default function ResearchScreen({ records, activeTab, onTab, first, second, onFirst, onSecond, onEdit, storageReady, ArtworkImage, Source }) {
  const [picker,setPicker] = useState(null);
  const [catalogId,setCatalogId] = useState(records[0].id);
  const [filter,setFilter] = useState('all');
  const [group,setGroup] = useState('all');
  const [pairLimit,setPairLimit] = useState(20);
  const [threshold,setThreshold] = useState(3);
  const [settings,setSettings] = useState(false);
  const [method,setMethod] = useState(false);
  const [pairDetail,setPairDetail] = useState(null);
  const a = records.find(r=>r.id === first) || records[0], b = records.find(r=>r.id === second) || records[1] || records[0];
  const result = model.compare(a,b);
  const score = result.count >= threshold ? result.score : null;
  const summary = protocol.sampleSummary(records);
  const catalog = records.find(r=>r.id === catalogId) || records[0];
  const pairs = useMemo(()=>protocol.comparisonPairs(records,group),[records,group]);
  const rows = result.rows.filter(r=>filter === 'all' || (filter === 'available' ? r.a !== null || r.b !== null : r.group === filter));
  const pickerCurrent = picker === 'first' ? first : picker === 'second' ? second : catalog.id;
  function pick(id) {
    if (picker === 'first') onFirst(id);
    else if (picker === 'second') onSecond(id);
    else setCatalogId(id);
    setPicker(null);
  }
  return <View style={s.screen}>
    <View style={s.header}>
      <View style={s.headerText}><Text style={s.eyebrow}>● TÜBİTAK · HELLENİSTİK KORPUS</Text><Text accessibilityRole="header" style={s.title}>{activeTab === 'compare' ? 'İkonografik ve Biçimsel Analiz' : activeTab === 'groups' ? 'Tanrı Kimliğine Göre Analiz' : 'Katalog & Eser Fişi'}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Analiz parametreleri ve ayarlar" onPress={()=>setSettings(true)} style={s.settings}><Text style={s.settingsIcon}>☷</Text></Pressable>
    </View>
    <ScrollView key={activeTab} style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      {activeTab === 'compare' && <>
        <View style={s.card}>
          <View style={s.row}><Text style={s.label}>KARŞILAŞTIRILAN ESER ÇİFTİ</Text><Button label="Yer değiştir ⇄" onPress={()=>{onFirst(second);onSecond(first);}}/></View>
          {[{record:a,target:'first',label:'Birinci eser'},{record:b,target:'second',label:'İkinci eser'}].map(({record,target,label})=><Pressable key={target} accessibilityRole="button" accessibilityLabel={label+': '+record.title} onPress={()=>setPicker(target)} style={[s.artifact,record.subject === 'Apollon' ? s.apollo : s.aphrodite]}>
            <View style={s.row}><Text style={s.small}>{label}</Text><Badge subject={record.subject}/></View>
            <View style={s.artifactBody}>
              {catalogImages[record.id] || record.image ? <Image key={record.id} source={catalogImages[record.id] || {uri:record.image}} accessibilityLabel={label+' fotoğrafı: '+record.title} resizeMode="contain" style={s.artifactPhoto}/> : <View style={s.artifactPhoto}><Text style={s.small}>Görsel yok</Text></View>}
              <View style={s.artifactInfo}><Text style={s.artifactTitle}>{record.title}⌄</Text><Text style={s.small}>{record.date}</Text><Text style={s.small}>{protocol.roles[protocol.role(record)]}</Text></View>
            </View>
          </Pressable>)}
        </View>
        <View style={[s.card,s.scoreCard]}>
          <View style={s.row}><Text style={s.status}>{result.same ? 'İki farklı eser seçin' : score === null ? `Asgari veri eşiği: ${threshold} alan` : 'Karşılaştırma eşiği sağlandı'}</Text><Text style={s.coverage}>%{result.coverage}</Text></View>
          <Text style={s.scoreTitle}>{result.same ? 'Aynı eser için puan hesaplanmaz' : score === null ? 'Benzerlik puanı için veri yetersiz' : `Benzerlik Puanı: %${score}`}</Text>
          <Text style={s.copy}>{result.count} / {model.fields.length} alan karşılaştırılabilir · Veri kapsamı %{result.coverage}</Text>
          <View style={s.track}><View style={[s.progress,{width:`${result.coverage}%`}]}/></View>
          <View style={s.row}>{result.groups.map(g=><View key={g.name} style={[s.subscore,g.name === 'İkonografi' ? s.iconography : s.form]}><Text style={s.label}>{g.name} ({g.name === 'İkonografi' ? 3 : 5} alan)</Text><Text style={s.subscoreText}>{g.score === null || result.same ? 'Değerlendirilemiyor' : `%${g.score} uyum · ${g.count} alan`}</Text></View>)}</View>
          <Button primary label="Eksik Alanları Kodla" disabled={!storageReady} onPress={()=>onEdit(a)}/>
        </View>
        <Text style={s.label}>GÖRÜNÜM FİLTRESİ · {rows.length} KRİTER</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pills}>{[{id:'all',label:'Tümü (8)'},{id:'available',label:'Sadece Veri Olanlar'},{id:'İkonografi',label:'İkonografi'},{id:'Biçim',label:'Biçim'}].map(f=><Pill key={f.id} label={f.label} selected={filter === f.id} onPress={()=>setFilter(f.id)}/>)}</ScrollView>
        {rows.map(r=><View key={r.id} style={[s.card,r.status === 'Ortak' && s.matched]}><View style={s.row}><View style={s.flex}><Text style={s.criterion}>{r.label}</Text><Text style={s.category}>{r.group === 'İkonografi' ? 'İKONOGRAFİK ÖZELLİK' : 'BİÇİMSEL ÖZELLİK'}</Text></View><Text style={[s.status,r.status === 'Ortak' && s.matchStatus]}>{r.status === 'Ortak' ? 'Ortak · Eşleşti' : r.status}</Text></View>{[{record:a,value:r.a},{record:b,value:r.b}].map(({record,value},index)=><View key={index} style={[s.valueRow,index === 0 ? s.apolloValue : s.aphroditeValue]}><Text style={s.valueTitle}>{record.title}</Text><Text style={[s.value,!value && s.unknown]}>{value ?? 'Bilinmiyor / değerlendirilemiyor'}</Text></View>)}</View>)}
        <Button label={method ? 'Yöntemi gizle ⌃' : 'Puan nasıl hesaplanır? ⌄'} onPress={()=>setMethod(!method)}/>
        {method && <View style={s.card}><Text style={s.criterion}>Şeffaf karşılaştırma</Text><Text style={s.copy}>Puan = ortak / karşılaştırılabilir özellik × 100. Bilinmeyenler paydadan çıkarılır. Başlangıç eşiği 3 alandır; bu eşik bilimsel doğrulama değil, uzman incelemesi bekleyen tasarım kararıdır. Serbest gözlem metinleri puana katılmaz. Benzerlik ortak atölye veya tarihsel etkileşim kanıtı değildir.</Text></View>}
      </>}
      {activeTab === 'groups' && <>
        <View style={s.card}><Text style={s.label}>KORPUS ÖRNEKLEM DURUMU</Text><View style={s.row}>{[{label:'Kabul Edilen',value:summary.total},{label:'Apollon',value:summary.apollon},{label:'Afrodit',value:summary.afrodit}].map(item=><View key={item.label} style={s.metric}><Text style={s.small}>{item.label}</Text><Text style={s.metricNumber}>{item.value}</Text></View>)}</View><Text style={s.copy}>Hedef toplam 10–15; tanrı başına 5–8, toplam en fazla 15 eser. Aşağıdaki katalog karşılaştırmaları referansları da içerir; örnekleme kabul edilmiş olduklarını göstermez. Mevcut kodlardan hesaplanır.</Text></View>
        <View style={s.wrappedPills}>{Object.entries(groupNames).map(([id,label])=><Pill key={id} label={label} selected={group===id} onPress={()=>{setGroup(id);setPairLimit(20);}}/>)}</View>
        <Text style={s.label}>{pairs.length} KATALOG ÇİFTİ</Text>
        {pairs.length === 0 && <View style={s.card}><Text style={s.copy}>Seçili grupta karşılaştırılabilir en az iki katalog kaydı gereklidir.</Text></View>}
        {pairs.slice(0,pairLimit).map(pair=><Pressable accessibilityRole="button" accessibilityLabel={pair.firstTitle+' / '+pair.secondTitle+' ayrıntıları'} key={pair.first+'-'+pair.second} style={s.card} onPress={()=>setPairDetail(pair)}><Text style={s.category}>{groupNames[pair.group]}</Text><Text style={s.criterion}>{pair.firstTitle} / {pair.secondTitle}</Text><View style={s.row}><Text style={s.pairScore}>{pair.count < threshold || pair.score === null ? 'Veri yetersiz' : `${pair.score} / 100`}</Text><Text style={s.small}>%{pair.coverage} kapsam · {pair.count}/8 alan ↗</Text></View></Pressable>)}
        {pairs.length > pairLimit && <Button label="Daha fazla çift göster" onPress={()=>setPairLimit(limit=>limit+20)}/>}
      </>}
      {activeTab === 'catalog' && <>
        <Button label={'Eser seç: '+catalog.title} onPress={()=>setPicker('catalog')}/>
        <Text style={s.small}>Hellenistik Dönem · Apollon ve Aphrodite · {records.length} eser</Text>
        <View style={s.imageCard}>
          {catalog.image && <ArtworkImage record={catalog}/>}
          <View style={s.imageCardBody}>
            <Badge subject={catalog.subject}/>
            <Text style={s.catalogTitle}>{catalog.title}</Text>
            <Text style={s.copy}>{catalog.date} · {catalog.museum}</Text>
            <ArtifactDetails key={catalog.id} record={catalog} Source={Source}/>
            <View style={s.notice}><Text style={s.label}>DOĞRULAMA DURUMU</Text><Text style={s.copy}>{protocol.completionLabel(catalog)}</Text></View>
            <Text style={s.copy}>{catalog.preservation}</Text>
            <Button primary label="Eser fişi ve elle kodlama" disabled={!storageReady} onPress={()=>onEdit(catalog)}/>
          </View>
        </View>
      </>}
      <Text style={s.footnote}>Araştırma prototipi · Özellikler elle kodlanır. Bağımsız kodlayıcı uyumu ve uzman doğrulaması tamamlanmış sayılmaz.</Text>
    </ScrollView>
    <View accessibilityRole="tablist" style={s.tabBar}>{tabs.map(tab=><Pressable key={tab.id} accessibilityRole="tab" accessibilityState={{selected:activeTab === tab.id}} accessibilityLabel={tab.label} onPress={()=>onTab(tab.id)} style={s.tab}><View style={[s.tabIconBox,activeTab === tab.id && s.tabIconActive]}><Text style={[s.tabIcon,activeTab === tab.id && s.gold]}>{tab.icon}</Text></View><Text style={[s.tabText,activeTab === tab.id && s.tabTextActive]}>{tab.label}</Text></Pressable>)}</View>
    <Sheet visible={Boolean(picker)} title="Katalogdan eser seç" onClose={()=>setPicker(null)}>{records.map(record=><Pressable accessibilityRole="button" accessibilityState={{selected:pickerCurrent === record.id}} key={record.id} onPress={()=>pick(record.id)} style={[s.choice,pickerCurrent === record.id && s.choiceSelected]}><Badge subject={record.subject}/><Text style={s.criterion}>{record.title}</Text><Text style={s.copy}>{record.date} · {record.inventory}</Text><Text style={s.small}>{protocol.roles[protocol.role(record)]}</Text></Pressable>)}</Sheet>
    <Sheet visible={settings} title="Analiz Parametreleri" onClose={()=>setSettings(false)}><Text style={s.criterion}>Asgari karşılaştırılabilir alan eşiği</Text><Text style={s.copy}>Seçili eşik: {threshold} / 8 alan. Başlangıç değeri 3; bilimsel doğrulama iddiası taşımaz. Değişiklik bu oturumdaki karşılaştırmaları etkiler.</Text><View style={s.wrappedPills}>{[3,4,5,6,7,8].map(value=><Pill key={value} label={String(value)} selected={threshold === value} onPress={()=>setThreshold(value)}/>)}</View><View style={s.notice}><Text style={s.copy}>Doğrulanmamış PDF ön kayıtları bir ayarla örnekleme kabul edilmez. Örneklem statüsü ve katalog karşılaştırması ayrı tutulur.</Text></View><Button primary label="Parametreleri Uygula" onPress={()=>setSettings(false)}/></Sheet>
    <Sheet visible={Boolean(pairDetail)} title="Eşleşme ayrıntıları" onClose={()=>setPairDetail(null)}>{pairDetail && <><Text style={s.catalogTitle}>{pairDetail.firstTitle} / {pairDetail.secondTitle}</Text><Text style={s.copy}>{pairDetail.count} / 8 alan karşılaştırılabilir · %{pairDetail.coverage} kapsam</Text>{pairDetail.rows.map(row=><View key={row.id} style={s.choice}><Text style={s.criterion}>{row.label} · {row.status}</Text><Text style={s.copy}>{row.a ?? 'Bilinmiyor'} / {row.b ?? 'Bilinmiyor'}</Text></View>)}</>}</Sheet>
  </View>;
}

const s = StyleSheet.create({
  artifactBody:{flexDirection:'row',alignItems:'center',gap:12},artifactPhoto:{width:88,height:116,borderRadius:9,backgroundColor:'#E9E7E1',alignItems:'center',justifyContent:'center'},artifactInfo:{flex:1,minWidth:0,gap:6},
  screen:{flex:1,backgroundColor:'#FAF6EE'},flex:{flex:1},white:{color:'#fff'},gold:{color:'#F2C14E'},disabled:{opacity:0.45},
  header:{backgroundColor:'#142838',paddingHorizontal:20,paddingVertical:18,flexDirection:'row',alignItems:'center',gap:12},headerText:{flex:1},eyebrow:{color:'#EABD45',fontSize:10,fontWeight:'800',letterSpacing:1.3,marginBottom:7},title:{fontFamily:serif,fontSize:22,lineHeight:28,fontWeight:'700',color:'#fff'},settings:{width:44,height:44,borderRadius:22,backgroundColor:'#29465A',borderWidth:1,borderColor:'#AA9258',alignItems:'center',justifyContent:'center'},settingsIcon:{color:'#F2C14E',fontSize:27},
  scroll:{flex:1},content:{padding:16,gap:14,maxWidth:640,width:'100%',alignSelf:'center',paddingBottom:28},card:{padding:16,borderRadius:18,borderWidth:1,borderColor:'#E6DCCB',backgroundColor:'#FFFDF9',gap:10},row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap'},label:{fontSize:10,fontWeight:'800',color:'#625646',letterSpacing:0.6,flexShrink:1},small:{fontSize:11,lineHeight:17,color:'#625646'},copy:{fontSize:12,lineHeight:20,color:'#574F45'},criterion:{fontSize:15,lineHeight:21,fontWeight:'700',color:'#142838'},category:{fontSize:9,letterSpacing:0.7,fontWeight:'800',color:'#655B9B',marginTop:5},
  button:{minHeight:44,borderRadius:12,borderWidth:1,borderColor:'#D8CCB8',backgroundColor:'#FFFDF9',paddingHorizontal:14,paddingVertical:12,justifyContent:'center',alignItems:'center'},buttonText:{fontSize:12,fontWeight:'700',color:'#142838',textAlign:'center'},primary:{backgroundColor:'#142838',borderColor:'#142838'},artifact:{borderWidth:1,borderRadius:13,padding:12,gap:5},artifactTitle:{fontSize:15,fontWeight:'700',color:'#142838',lineHeight:22},badge:{fontSize:10,fontWeight:'800',paddingVertical:4,paddingHorizontal:9,borderRadius:20,overflow:'hidden',alignSelf:'flex-start'},apollo:{backgroundColor:'#E9F2FA',borderColor:'#C5DDEC',color:'#214765'},aphrodite:{backgroundColor:'#FBECEF',borderColor:'#EDCED6',color:'#873C53'},
  scoreCard:{backgroundColor:'#F8F1E3',borderColor:'#DBC8A5'},status:{backgroundColor:'#F5E7C4',color:'#895616',fontSize:10,fontWeight:'700',paddingHorizontal:10,paddingVertical:6,borderRadius:20,overflow:'hidden'},coverage:{fontSize:22,fontWeight:'800',color:'#B25431',fontFamily:serif},scoreTitle:{fontSize:20,lineHeight:26,color:'#142838',fontFamily:serif,fontWeight:'700'},track:{height:5,borderRadius:4,backgroundColor:'#E6DCCB',overflow:'hidden'},progress:{height:5,backgroundColor:'#C85A32'},subscore:{flex:1,minWidth:120,padding:12,borderRadius:12,gap:6},subscoreText:{fontSize:12,fontWeight:'700',color:'#142838'},iconography:{backgroundColor:'#EDEBFA'},form:{backgroundColor:'#E2F2EE'},pills:{gap:7},wrappedPills:{flexDirection:'row',flexWrap:'wrap',gap:8},pill:{minHeight:44,borderRadius:24,borderWidth:1,borderColor:'#E2D7C5',paddingVertical:12,paddingHorizontal:15,backgroundColor:'#FFFDF9',justifyContent:'center'},pillSelected:{backgroundColor:'#142838',borderColor:'#142838'},pillText:{fontSize:11,fontWeight:'700',color:'#625646'},
  matched:{borderColor:'#8CCCB0'},matchStatus:{backgroundColor:'#DFF2E8',color:'#21694D'},valueRow:{padding:10,borderRadius:10,gap:4},apolloValue:{backgroundColor:'#EDF4FA'},aphroditeValue:{backgroundColor:'#FAEEF1'},valueTitle:{fontSize:11,fontWeight:'700',color:'#253B4D'},value:{fontSize:12,lineHeight:19,color:'#142838'},unknown:{color:'#817465',fontStyle:'italic'},metric:{flex:1,padding:12,borderRadius:12,backgroundColor:'#F4EEDC',minWidth:80,alignItems:'center',gap:6},metricNumber:{fontSize:25,fontWeight:'700',fontFamily:serif,color:'#142838'},pairScore:{fontSize:17,fontWeight:'800',color:'#277252',marginTop:6},
  imageCard:{borderRadius:18,overflow:'hidden',borderWidth:1,borderColor:'#E6DCCB',backgroundColor:'#FFFDF9'},imageCardBody:{padding:16,gap:12},catalogTitle:{fontFamily:serif,fontSize:24,lineHeight:30,fontWeight:'700',color:'#142838'},notice:{padding:13,gap:7,borderRadius:12,backgroundColor:'#FFF2D9',borderWidth:1,borderColor:'#EAD5A5'},featureChip:{width:'48%',padding:10,borderRadius:10,backgroundColor:'#EEF3F8',gap:6},featureValue:{fontSize:12,fontWeight:'700',color:'#142838'},footnote:{fontSize:11,lineHeight:18,color:'#776B5B',paddingHorizontal:4},
  tabBar:{flexDirection:'row',backgroundColor:'#FFFDF9',borderTopWidth:1,borderColor:'#E6DCCB',paddingTop:8,paddingBottom:6},tab:{flex:1,alignItems:'center',padding:4,gap:4,minHeight:60},tabIconBox:{borderRadius:12,width:44,height:33,alignItems:'center',justifyContent:'center'},tabIconActive:{backgroundColor:'#142838'},tabIcon:{fontSize:24,color:'#958773'},tabText:{fontSize:10,fontWeight:'600',color:'#8C8170'},tabTextActive:{color:'#142838',fontWeight:'800'},
  backdrop:{flex:1,backgroundColor:'#0F1E2AAA',justifyContent:'flex-end'},sheet:{maxHeight:'90%',backgroundColor:'#FAF6EE',borderTopLeftRadius:24,borderTopRightRadius:24,overflow:'hidden'},sheetHeader:{backgroundColor:'#142838',padding:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},sheetTitle:{fontFamily:serif,fontSize:21,fontWeight:'700',color:'#fff',flex:1},sheetContent:{padding:18,gap:12},choice:{padding:14,borderRadius:13,borderWidth:1,borderColor:'#E6DCCB',backgroundColor:'#FFFDF9',gap:6},choiceSelected:{borderColor:'#C85A32',borderWidth:2},
});
