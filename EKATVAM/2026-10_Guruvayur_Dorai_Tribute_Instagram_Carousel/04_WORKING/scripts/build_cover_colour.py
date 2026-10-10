"""Builds the real-colour portrait composite for the burgundy cover.
The supplied photo's pink backdrop is matted out by colour (soft matte, edge pixels un-mixed), the figure is kept in
its natural colours, and a burgundy ground is substituted. Run from the project folder."""
from PIL import Image, ImageFilter
import numpy as np
rng=np.random.default_rng(41)
P="03_SOURCE_ASSETS/photography/"
src=np.asarray(Image.open(P+"GuruvayurDorai_portrait_supplied.jpg").convert("RGB")).astype(float)
R,G,B=src[...,0],src[...,1],src[...,2]
a0=np.clip(((R-G)-78)/58,0,1); yy=np.arange(2000)[:,None]; a0=a0*np.clip((1215-yy)/45,0,1)
A=Image.fromarray((a0*255).astype(np.uint8)).filter(ImageFilter.MedianFilter(5))
a_core=np.asarray(A.filter(ImageFilter.GaussianBlur(.8))).astype(float)/255
ad=np.asarray(A.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(1.8))).astype(float)/255
a=np.maximum(a_core,ad*0.97)
bl=np.asarray(A.filter(ImageFilter.GaussianBlur(7))).astype(float)/255
a=np.maximum(a,np.clip((bl-.30)/.22,0,1)); a=np.where(a>.72,1.0,a)
prot=np.zeros_like(a); prot[40:640,400:830]=1          # head, face, neck: gentle matte only
a=np.where(prot>0,a_core,a)
fg=np.where(a[...,None]<.95,np.clip((src-a[...,None]*np.array([196,52,95.]))/np.maximum(1-a[...,None],.08),0,255),src)
fgm=np.asarray(Image.fromarray(fg.astype(np.uint8)).filter(ImageFilter.MedianFilter(5))).astype(float)
part=((a>.02)&(a<.95)&(prot==0))[...,None]; fg=np.where(part,fgm,fg)   # tidy specks on the drum rim, not the face
W,H=1080,1350; S=.68; ox,oy=-80,70
Y,X=np.mgrid[0:H,0:W]
def sm(t): t=np.clip(t,0,1); return t*t*(3-2*t)
def burgundy():
    d=np.sqrt(((X-380)/760)**2+((Y-330)/900)**2)[...,None]
    c0=np.array([0x86,0x34,0x2C],float); c1=np.array([0x6C,0x28,0x21],float); c2=np.array([0x45,0x16,0x13],float)
    t=np.clip(d,0,1.4); base=np.where(t<.55,c0+(c1-c0)*(t/.55),c1+(c2-c1)*np.clip((t-.55)/.85,0,1))
    n=rng.normal(0,1,(H//60+2,W//60+2)); nm=np.asarray(Image.fromarray(((n-n.min())/(n.max()-n.min())*255).astype(np.uint8)).resize((W,H),Image.BICUBIC)).astype(float)/255-.5
    return np.clip(base*(1+nm[...,None]*.05)+rng.normal(0,2.4,(H,W))[...,None],0,255)
bg=burgundy()
ph=Image.fromarray(fg.astype(np.uint8)).resize((int(2000*S),)*2,Image.LANCZOS)
al=Image.fromarray((a*255).astype(np.uint8)).resize(ph.size,Image.LANCZOS)
pa=np.asarray(ph).astype(float); aa=np.asarray(al).astype(float)/255
out=bg.copy()
xs0=max(0,ox); ys0=max(0,oy); xe=min(W,ox+ph.size[0]); ye=min(H,oy+ph.size[1])
sub=pa[ys0-oy:ye-oy, xs0-ox:xe-ox]; suba=aa[ys0-oy:ye-oy, xs0-ox:xe-ox]
out[ys0:ye,xs0:xe]=bg[ys0:ye,xs0:xe]*suba[...,None]+sub*(1-suba[...,None])
r=np.sqrt(((X-540)/800)**2+((Y-560)/760)**2)
m=(1-sm((r-.72)/.30))*(1-sm((Y-800)/270))*(1-sm((Y-810)/60)*sm((200-X)/70))
# the face is never faded: head, forehead and neck always at full strength
hx0,hx1,hy0,hy1=120,560,80,520
box=sm((X-hx0+30)/30)*sm((hx1+30-X)/30)*sm((Y-hy0+30)/30)*sm((hy1+30-Y)/30)
m=np.maximum(m,box)
out=bg*(1-m[...,None])+out*m[...,None]
Image.fromarray(np.clip(out,0,255).astype(np.uint8)).save(P+"cover_colour_burgundy.jpg",quality=95)
