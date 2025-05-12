// sketch.js

// ---- 全局变量 ----
let data1, data2, data3;
let stage = 0;
let stageStart;

// 可调参数（初始默认值）
let flapAmplitude = 0.5;
let flapFrequency = 0.005;
let floatAmplitude = 5;
let skewAmplitude = 10;
let shearAmplitude = 0.3;
let duration = 6000;
let pauseTime = 2000;
let outEasePower = 1;

let isStartLock = true;
let startLockFrames = 3;

// 颜色
let fontColor = '#000000';
let bgColor = '#ffffff';
let panelColor = '#cccccc';
let panelAlpha = 255;
let overlayTextColor = '#000000';

// 背景图/视频
let bgMedia;
let bgIsVideo = false;

// 底部文本框
let editableLine1 = "INFITATION邀请函";
let editableLine2 = "REDesign";

// 录制（使用 MediaRecorder）
let mediaRecorder;
let recordedChunks = [];
let isRecording = false;
let recordStartTime = 0;
let timerP;

// ---- 新增：按住鼠标累加所需变量 ----
let _holdStart = 0;
let holdBaseFloat = 0;
let holdBaseSkew  = 0;
// 变化速率倍增因子
const holdIncreaseRate = 10;

function preload() {
  data1 = loadJSON("ai-letters-stable-export-1.json");
  data2 = loadJSON("ai-letters-stable-export-2.json");
  data3 = loadJSON("ai-letters-stable-export-3.json");
}

function setup() {
  // ---- 画布与基础设置 ----
  let cnv = createCanvas(600, 800);
  cnv.id('myCanvas');
  textAlign(LEFT, BASELINE);
  frameRate(60);
  stageStart = millis();

  // ---- 绑定画布鼠标按下/释放事件 ----
  cnv.mousePressed(() => {
    if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
      _holdStart    = millis();
      holdBaseFloat = floatAmplitude;
      holdBaseSkew  = skewAmplitude;
    }
  });
  cnv.mouseReleased(() => {
    _holdStart     = 0;
    floatAmplitude = holdBaseFloat;
    skewAmplitude  = holdBaseSkew;
  });

  // ---- 计时显示（画布外侧） ----
  timerP = createP('Recording: 0.00s');
  timerP.position(width + 20, 10);

  // ---- 初始化 MediaRecorder ----
  const canvasStream = document.getElementById('myCanvas').captureStream(60);
  mediaRecorder = new MediaRecorder(canvasStream, { mimeType: 'video/webm; codecs=vp9' });
  mediaRecorder.ondataavailable = e => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };
  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = createA(url, '下载视频');
    a.attribute('download', 'recording.webm');
    a.position(width + 20, 40);
    recordedChunks = [];
  };

  // ---- 操作面板（全部右移） ----
  let yOffset = height + 10;
  createP('上传背景图或视频：').position(width + 20, yOffset);
  createFileInput(handleBgUpload).position(width + 180, yOffset);

  createParamSlider("字体颜色:", colorPicker(fontColor, v=>fontColor=v), yOffset+=30);
  createParamSlider("背景颜色:", colorPicker(bgColor, v=>bgColor=v), yOffset+=30);
  createParamSlider("矩形颜色:", colorPicker(panelColor, v=>panelColor=v), yOffset+=30);
  createParamSlider("矩形透明度:", slider(0,255,panelAlpha,1,v=>panelAlpha=v), yOffset+=30);
  createParamSlider("矩形字体颜色:", colorPicker(overlayTextColor,v=>overlayTextColor=v), yOffset+=30);

  createParamSlider("第一行文本:", input(editableLine1, v=>editableLine1=v), yOffset+=30);
  createParamSlider("第二行文本:", input(editableLine2, v=>editableLine2=v), yOffset+=30);

  createParamSlider("flapAmplitude", slider(0,2,flapAmplitude,0.01,v=>flapAmplitude=v), yOffset+=40);
  createParamSlider("flapFrequency", slider(0.001,0.05,flapFrequency,0.001,v=>flapFrequency=v), yOffset+=30);
  createParamSlider("floatAmplitude", slider(0,30,floatAmplitude,1,v=>floatAmplitude=v), yOffset+=30);
  createParamSlider("skewAmplitude", slider(0,30,skewAmplitude,1,v=>skewAmplitude=v), yOffset+=30);
  createParamSlider("shearAmplitude", slider(0,1,shearAmplitude,0.01,v=>shearAmplitude=v), yOffset+=30);
  createParamSlider("duration", slider(1000,10000,duration,100,v=>duration=v), yOffset+=30);
  createParamSlider("pauseTime", slider(0,5000,pauseTime,100,v=>pauseTime=v), yOffset+=30);
  createParamSlider("outEasePower", slider(0.1,5,outEasePower,0.1,v=>outEasePower=v), yOffset+=30);

  createButton("📷 保存 JPG")
    .position(width + 20, yOffset+=40).mousePressed(()=>saveCanvas("frame","jpg"));

  createButton("⏺️ 开始录制")
    .position(width + 180, yOffset).mousePressed(startRecording);
  createButton("⏹️ 停止录制")
    .position(width + 300, yOffset).mousePressed(stopRecording);
}

function handleBgUpload(file) {
  if (file.type==='image') {
    bgMedia = loadImage(file.data);
    bgIsVideo = false;
  } else if (file.type==='video') {
    bgMedia = createVideo(file.data, ()=>{
      bgMedia.loop(); bgMedia.hide();
    });
    bgIsVideo = true;
  } else bgMedia = null;
}

function draw() {
  // ---- 动画分段逻辑 ----
  let now = millis(), elapsed = now - stageStart;
  if (stage%2===0 && elapsed>=duration) {
    stage++; stageStart=millis(); if(stage>5)stage=0; return;
  } else if (stage%2===1 && elapsed>=pauseTime) {
    stage++; stageStart=millis(); if(stage>5)stage=0; return;
  }

  // ---- 背景 ----
  if (bgMedia) {
    if (bgIsVideo) image(bgMedia,0,0,width,height);
    else { background(bgColor); image(bgMedia,0,0,width,height); }
  } else background(bgColor);

  // ---- 字母动画 ----
  for (let i=0; i<data1.letters.length; i++){
    let l1=data1.letters[i];
    let l2=data2.letters.find(l=>l.textFrameID===l1.textFrameID);
    let l3=data3.letters.find(l=>l.textFrameID===l1.textFrameID);
    let pos={x:l1.x,y:l1.y};
    let amt=constrain(elapsed/duration,0,1);
    if(stage===0) pos=lerpOutIn(l1,l2,amt,i);
    else if(stage===1) pos=l2;
    else if(stage===2) pos=lerpOutIn(l2,l3,amt,i);
    else if(stage===3) pos=l3;
    else if(stage===4) pos=lerpOutIn(l3,l1,amt,i);

    let t=millis()*flapFrequency;
    let flap=sin(t+i)*flapAmplitude+1;
    let floatOffset=sin(t+i+1000)*floatAmplitude;
    let skewOffset=sin(t+i+2000)*skewAmplitude;
    let shearAngle=sin(t+i+3000)*shearAmplitude;

    push();
    translate(pos.x+skewOffset,pos.y);
    shearX(shearAngle);
    scale(1,flap);
    textSize(l1.fontSize||20);
    fill(fontColor);
    text(l1.letter,0,floatOffset);
    pop();
  }

  // ---- 底部面板 & 文本 ----
  let panelW=573,panelH=73;
  let panelX=(width-panelW)/2,panelY=height-14-panelH;
  noStroke();
  let c=color(panelColor);c.setAlpha(panelAlpha);fill(c);
  rect(panelX,panelY,panelW,panelH,10);
  let cx=panelX+panelW/2,cy=panelY+panelH/2;
  textAlign(CENTER,CENTER);textSize(25);fill(overlayTextColor);
  text(editableLine1,cx,cy-13.5);
  text(editableLine2,cx,cy+13.5);

  if(frameCount>startLockFrames) isStartLock=false;

  // ---- 录制时更新计时 ----
  if(isRecording){
    let elapsedRec=(millis()-recordStartTime)/1000;
    timerP.html('Recording: '+elapsedRec.toFixed(2)+'s');
  }

  // ---- 新增：按住鼠标时累加振幅 ----
  if(_holdStart>0){
    let dt = (millis() - _holdStart) / 1000;
    floatAmplitude = holdBaseFloat + dt * holdIncreaseRate;
    skewAmplitude  = holdBaseSkew  + dt * holdIncreaseRate;
    // 不要重置 _holdStart，这样 dt 会累积
  }
}

function lerpOutIn(a,b,amt,i=0){
  let outX=a.x+width*1.2,inX=-width*0.2;
  if(amt<0.5){
    let t=amt*2;
    if(isStartLock) return {x:a.x,y:a.y};
    let eased=pow(t,outEasePower+1)/(outEasePower+1);
    let norm=eased/(1/(outEasePower+1));
    let yOff=sin(t*TWO_PI*2+i*0.7)*10;
    return {x:lerp(a.x,outX,norm),y:a.y+yOff};
  } else {
    let t=(amt-0.5)*2;
    return {x:lerp(inX,b.x,t),y:lerp(a.y,b.y,t)};
  }
}

// ---- 工具函数 ----
function createParamSlider(label,element,y){
  createSpan(label).position(width+20,y);
  element.position(width+180,y);
}
function colorPicker(initial,onChange){
  let cp=createColorPicker(initial);
  cp.input(()=>onChange(cp.value()));
  return cp;
}
function slider(min,max,val,step,onChange){
  let s=createSlider(min,max,val,step);
  s.input(()=>onChange(s.value()));
  return s;
}
function input(val,onChange){
  let i=createInput(val);
  i.input(()=>onChange(i.value()));
  return i;
}

// ---- 录制控制 ----
function startRecording(){
  recordedChunks=[];
  mediaRecorder.start();
  isRecording=true;
  recordStartTime=millis();
  timerP.html('Recording: 0.00s');
}
function stopRecording(){
  if(mediaRecorder&&mediaRecorder.state!=='inactive'){
    mediaRecorder.stop();
    isRecording=false;
  }
}
