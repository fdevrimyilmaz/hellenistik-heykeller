import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const { overviewFields } = require('./catalog-presentation');
const content = require('./iconography-content');
const model = require('./research-model');

function Description({ label, text }) {
  return <View style={styles.description}><Text style={styles.heading}>{label}</Text><Text selectable style={styles.copy}>{text || 'Bu eser için metin henüz eklenmemiş.'}</Text></View>;
}

export default function ArtifactDetails({ record, Source }) {
  const [section, setSection] = useState('overview');
  const original = content[record.id];
  const iconography = record.iconographyText ?? original?.paragraphs?.join('\n\n');
  const style = record.styleText ?? original?.styleParagraphs?.join('\n\n');
  return <View style={styles.container}>
    <Text accessibilityRole="header" style={styles.title}>Sanat Eseri Detayları</Text>
    <View accessibilityRole="tablist" style={styles.sections}>
      {[['overview','Genel Bakış'],['references','Referanslar']].map(([id,label]) =>
        <Pressable key={id} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{selected:section === id}} onPress={()=>setSection(id)} style={[styles.section,section === id && styles.selected]}><Text style={[styles.sectionText,section === id && styles.selectedText]}>{label}</Text></Pressable>
      )}
    </View>
    {section === 'overview' ? <>
      <View style={styles.fields}>{overviewFields(record).map(([label,value])=>
        <View key={label} style={styles.field} testID={'overview-'+label}><Text style={styles.fieldLabel}>{label}:</Text><Text selectable style={styles.fieldValue}>{value}</Text></View>
      )}</View>
      <Description label="İkonografi" text={iconography}/>
      <Description label="Stil" text={style}/>
      {original?.note && <Text style={styles.note}>{original.note}</Text>}
      <Text style={styles.heading}>Kodlanmış özellikler</Text>
      <View style={styles.features}>{model.fields.map(field=><View key={field.id} style={styles.feature}><Text style={styles.featureLabel}>{field.label}</Text><Text style={styles.featureValue}>{record.features[field.id] ?? 'Bilinmiyor / değerlendirilemiyor'}</Text></View>)}</View>
    </> : <View style={styles.references}>
      <Description label="Referanslar" text={record.bibliography || 'Bilimsel yayın kaynakçası henüz eklenmemiş.'}/>
      {original?.source && <Description label="İkonografi ve stil metninin kaynağı" text={original.source}/>}
      <Description label="Müze / koleksiyon" text={record.museum}/>
      <Source record={record}/>
      <Description label="Görsel kredisi" text={record.imageCredit || 'Belirtilmemiş'}/>
      <Description label="Görsel lisansı" text={record.license || 'Belirtilmemiş'}/>
      <Description label="Görsel kaynağı" text={record.imageSource || record.source}/>
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  container:{gap:14},title:{fontSize:19,fontWeight:'700',color:'#142838',marginTop:8},
  sections:{flexDirection:'row',borderBottomWidth:1,borderColor:'#E6DCCB',gap:8},section:{paddingVertical:14,paddingHorizontal:16,minHeight:48,borderBottomWidth:3,borderColor:'transparent'},selected:{borderColor:'#C85A32',backgroundColor:'#F5EDE0'},sectionText:{fontSize:12,fontWeight:'600',color:'#746958'},selectedText:{color:'#142838',fontWeight:'800'},
  fields:{gap:0},field:{paddingVertical:11,borderBottomWidth:1,borderColor:'#EEE5D8',gap:5},fieldLabel:{fontSize:12,fontWeight:'800',color:'#142838'},fieldValue:{fontSize:13,lineHeight:21,color:'#574F45',flexShrink:1},
  description:{gap:8},heading:{fontSize:15,fontWeight:'800',color:'#142838'},copy:{fontSize:13,lineHeight:22,color:'#574F45'},note:{fontSize:11,lineHeight:18,color:'#776B5B'},features:{flexDirection:'row',flexWrap:'wrap',gap:8},feature:{width:'48%',padding:10,borderRadius:10,backgroundColor:'#EEF3F8',gap:6},featureLabel:{fontSize:11,color:'#625646'},featureValue:{fontSize:12,lineHeight:19,fontWeight:'600',color:'#142838'},references:{gap:16},
});
