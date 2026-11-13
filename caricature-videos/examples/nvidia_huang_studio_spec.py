import json
words=json.load(open('examples/nvidia_huang_studio_words.json'))
def cam(p0,t0,p1,t1,fov0=50,fov1=None,whoosh=False):
    return {"from":{"pos":p0,"target":t0,"fov":fov0},"to":{"pos":p1,"target":t1,"fov":fov1 or fov0},"whoosh":whoosh}
shots=[
 dict(start=0.0,end=1.2,set="hq",cam=cam([0,4,-45],[0,15,40],[0,8,-18],[0,15,40],50,46,True),
      cards=[dict(type="title",at=0.25,x=540,y=560,w=860,h=230,kicker="BREAKING",text="HUANG VOR DEM AUS?",glow=["red","pink"],sfx=[[0.05,"shimmer",0.35]])]),
 dict(start=1.2,end=2.05,set="hq",cam=cam([-6,9,8],[0,16,40],[-3,10,14],[0,16,40],48),
      panda=dict(pose="mikrofon",frame="medium"),
      cards=[dict(type="person",at=0.06,x=540,y=470,w=840,h=210,name="JENSEN HUANG",role="Nvidia-Chef seit 1993",badge="VOR DEM AUS?",badge_at=0.4,glow=["green","blue"])]),
 dict(start=2.05,end=3.95,set="boardroom",trans="whip",cam=cam([0,2.4,-4],[0,1,18],[0,2.0,4],[0,1,18],55,None,True),blur=1.2,
      panda=dict(pose="tipp_geben",frame="wide_right",enter="slide"),
      cards=[dict(type="news",at=0.15,x=540,y=520,w=880,h=270,kicker="LAUT WALL STREET JOURNAL",lines=["Board bereitet","Huangs Rauswurf vor"],glow=["blue","mint"])]),
 dict(start=3.95,end=5.95,set="boardroom",cam=cam([-4,2.5,2],[-11.9,3.5,13],[-7,2.8,7],[-11.9,3.5,13],52),blur=2.0,
      panda=dict(pose="wuetend",frame="close"),
      cards=[dict(type="stamp",glass=False,at=1.0,x=540,y=560,w=700,h=200,text="RAUSWURF?",size=96,sfx=[[0.0,"crack",0.5]])]),
 dict(start=5.95,end=8.75,set="office",cam=cam([-6,2.2,-1],[0,1,20],[-2,2.0,2],[0,1,20],55),blur=1.5,
      panda=dict(pose="zeigen",frame="medium_left",swap=[[1.85,"ueberrascht"]]),
      cards=[dict(type="chart",at=0.1,x=540,y=480,w=900,h=430,title="NVIDIA-AKTIE",sub="Mi · deutsche Zeit",
                  points=[0.35,0.45,0.42,0.6,0.55,0.72,0.68,0.78,0.5,0.2],drop_from=8,after_hours=True,draw_at=0.25,draw_end=1.9,badge="FAST −9 %",badge_at=1.85,glow=["red","blue"])]),
 dict(start=8.75,end=11.85,set="avenue",trans="zoom",cam=cam([0,4,0],[0,8,150],[0,6,60],[0,10,150],55,None,True),
      panda=dict(pose="selbstbewusst",frame="wide"),
      cards=[dict(type="kpi",at=0.15,x=540,y=480,w=840,h=250,kicker="BÖRSENWERT WEG",**{"from":0},to=400,fmt="−{} MRD. $",count_at=0.3,count_end=1.15,col=[228,56,66],glow=["red","gold"]),
             dict(type="icon",icon="money",at=1.4,x=540,y=780,w=300,h=190,glow=["green","gold"],s=0.75)]),
 dict(start=11.85,end=14.55,set="office",trans="whip",cam=cam([5,2.6,0],[0,1,16],[2,2.3,3],[0,1,16],55),blur=1.8,
      panda=dict(pose="nachdenklich",frame="close"),
      cards=[dict(type="quote",at=0.1,x=540,y=470,w=880,h=300,kicker="ANALYST DAN IVES",lines=["Ohne Huang wäre","Nvidia weniger wert"],glow=["blue","pink"])]),
 dict(start=14.55,end=17.45,set="studio",cam=cam([0,1.6,-6],[0,1.2,10],[0.6,1.5,-4.5],[0,1.2,10],45),
      panda=dict(pose="zeigestock",frame="medium_right"),
      cards=[dict(type="shrink",at=0.1,x=540,y=500,w=880,h=280,kicker="NVIDIA OHNE HUANG",label="BÖRSENWERT",cut=0.3,shrink_at=0.2,shrink_end=1.3,badge="−25 BIS −30 %",badge_at=1.2,glow=["red","blue"])]),
 dict(start=17.45,end=19.75,set="avenue",trans="zoom",cam=cam([0,6,80],[0,13,150],[0,9,118],[0,14,150],55,None,True),
      panda=dict(pose="zeigen",frame="wide_left",enter="slide"),
      cards=[dict(type="title",at=0.35,x=540,y=330,w=820,h=190,kicker="AM DIENSTAG",text="QUARTALSZAHLEN",glow=["blue","gold"])]),
 dict(start=19.75,end=21.5,set="studio",trans="zoom",cam=cam([0,1.6,-6],[0,1.2,10],[0,1.6,-5],[0,1.2,10],45),
      panda=dict(pose="augenzwinkern",frame="close"),
      cards=[dict(type="icon",icon="bell",at=0.1,x=540,y=470,w=360,h=330,label="FOLGEN!",glow=["gold","pink"])]),
]
spec=dict(audio="voice.wav",duration=21.5,words=words,header="BÖRSENNEWS · 13.11.2026",shots=shots,sfx_rel=0.7,master_lufs=-16.8)
json.dump(spec,open('examples/nvidia_huang.studio.json','w'),ensure_ascii=False,indent=1)
