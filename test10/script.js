const URL_1 = "./pose_model/";
let model_1, labelContainer_1, maxPredictions_1, webcam_1, ctx_1;

const URL_2 = "./image_model/";
let model_2, labelContainer_2, maxPredictions_2, webcam_2;

let starttime_1 = 0, starttime_2 = 0;
const endtime = 2000, sound = "warning_sound.mp3";

let current_lat, current_lon;

let signrest = true;

//초기화
async function init() {
    // 모델파일 및 메타데이터 URL 정의 
    const modelURL_1 = URL_1 + "model.json";
    const metadataURL_1 = URL_1 + "metadata.json";

    const modelURL_2 = URL_2 + "model.json";
    const metadataURL_2 = URL_2 + "metadata.json";

    // Teachable Machine Pose 모델을 로드하고, 모델이 가진 클래스의 최대 예측 수를 설정
    model_1 = await tmPose.load(modelURL_1, metadataURL_1);
    maxPredictions_1 = model_1.getTotalClasses();

    model_2 = await tmImage.load(modelURL_2, metadataURL_2);
    maxPredictions_2 = model_2.getTotalClasses();

    // 웹캠 설정
    const size = 400;
    const flip = true; // 좌우 반전

    initializeWebcamCanvas();
    
    webcam_1 = new tmPose.Webcam(size, size, flip); // width, height, flip
    await webcam_1.setup(); // access 권한 요청
    await webcam_1.play();
    
    webcam_2 = new tmImage.Webcam(size, size, flip); // width, height, flip
    await webcam_2.setup(); // access 권한 요청
    await webcam_2.play();

    window.requestAnimationFrame(loop);

    // 캔버스와 라벨 컨테이너를 초기화, 캔버스의 크기를 설정하고 캔버스 컨텍스트 가져오기, 라벨 컨테이너에 클래스 라벨을 표시하기 위한 div 요소들 추가
    const canvas = document.getElementById("canvas");
    canvas.width = size; canvas.height = size;
    ctx_1 = canvas.getContext("2d");
    labelContainer_1 = document.getElementById("label-container-1");
    for (let i = 0; i < maxPredictions_1; i++) { // and class labels
        labelContainer_1.appendChild(document.createElement("div"));
    }

    // 이미지 프로젝트 웹캠 활성화시 다시 활성화 : document.getElementById("webcam-container").appendChild(webcam_2.canvas);
    labelContainer_2 = document.getElementById("label-container-2");
    for (let i = 0; i < maxPredictions_2; i++) { // and class labels
        labelContainer_2.appendChild(document.createElement("div"));
    }
}
// 메인 루프 : 웹캠의 프레임을 업데이트 및 예측 함수 호출, 다음 프레임 요청
async function loop(timestamp) {
    webcam_1.update(); // update the webcam frame
    webcam_2.update();
    await predict();
    window.requestAnimationFrame(loop);
}

// 예측 함수
async function predict() {
    const { pose, posenetOutput } = await model_1.estimatePose(webcam_1.canvas);
    const prediction_1 = await model_1.predict(posenetOutput);
    const prediction_2 = await model_2.predict(webcam_2.canvas);
    
    // class2 예측 상황 추적 변수
    let class2pre_1 = false, class2pre_2 = false;
    // 경보음 출력 여부 결정 변수
    let signsound = false;
    
    // 확률 출력
    for (let i = 0; i < maxPredictions_1; i++) {
        const classPrediction_1 =
            "pose : " + prediction_1[i].className + ": " + prediction_1[i].probability.toFixed(2);
        labelContainer_1.childNodes[i].innerHTML = classPrediction_1;
            
        if (i == 1 && prediction_1[i].probability.toFixed(2) == 1.00) {
            class2pre_1 = true;
        }
    }
    for (let i = 0; i < maxPredictions_2; i++) {
        const classPrediction_2 =
            "image : " + prediction_2[i].className + ": " + prediction_2[i].probability.toFixed(2);
        labelContainer_2.childNodes[i].innerHTML = classPrediction_2;

        if (i == 1 && prediction_2[i].probability.toFixed(2) == 1.00) {
            class2pre_2 = true;
        }
    }
    // 시간 측정
    if(class2pre_1) {
        const currenttime = new Date().getTime();
        if(starttime_1 === 0) {
            starttime_1 = currenttime;
        } else {
            if(currenttime - starttime_1 >= endtime) {
                signsound = true;
                starttime_1 = 0;
            }
        }
    } else { starttime_1 = 0; }

    if(class2pre_2) {
        const currenttime = new Date().getTime();
        if(starttime_2 === 0) { starttime_2 = currenttime;
        } else {
            if(currenttime - starttime_2 >= endtime) {
                signsound = true;
                starttime_2 = 0;
            }
        }
    } else { starttime_2 = 0; }
        
    if(signsound) {
        PlaySound(sound)
        if(signrest) {
            restStart();
            signrest = false;
        }
    }

    drawPose(pose);
}

// 포즈 그리는 함수
function drawPose(pose) {
    if (webcam_1.canvas) {
        ctx_1.drawImage(webcam_1.canvas, 0, 0);
        // draw the keypoints and skeleton
        if (pose) {
            const minPartConfidence = 0.5;
            tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx_1);
            tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx_1);
        }
    }
}
// 경고음 출력(재생) 함수
function PlaySound(sound) {
    let audio = new Audio(sound);
    audio.play();
}

/*-----------------------------------------------------------------*/

function stopWebcams() {
    // 웹캠 1 정지
    if (webcam_1) {
        webcam_1.stop();
        webcam_1 = null;
    }

    // 웹캠 2 정지
    if (webcam_2) {
        webcam_2.stop();
        webcam_2 = null;
    }

    // 캔버스 영상을 검은 화면으로 만듭니다.
    const canvas_1 = document.getElementById("canvas");
    const ctx_1 = canvas_1.getContext("2d");
    ctx_1.fillStyle = "black";
    ctx_1.fillRect(0, 0, canvas_1.width, canvas_1.height);
}

// 웹캠 캔버스를 검은 화면으로 초기화하는 함수
function initializeWebcamCanvas() {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 400; // 원하는 가로 크기로 설정
    canvas.height = 400; // 원하는 세로 크기로 설정
    ctx.fillStyle = "black"; // 검은색으로 설정
    ctx.fillRect(0, 0, canvas.width, canvas.height); // 캔버스를 검은 색으로 채움
}

/*-----------------------------------------------------------------*/

let closestRestStop;

// 현재 위치를 가져오는 함수
function restStart() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition);
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}
// 위치 정보를 받아와 지도 및 가장 가까운 휴게소 정보를 출력하는 함수
function showPosition(position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const mapOptions = {
        center: new google.maps.LatLng(lat, lng),
        zoom: 12
    };
    const map = new google.maps.Map(document.getElementById("map"), mapOptions);
    const service = new google.maps.places.PlacesService(map);
    service.nearbySearch({
        location: map.getCenter(),
        radius: 50000, // 50km 반경 내에서 검색
        type: 'point_of_interest',
        keyword: '휴게소' // '휴게소' 키워드로 검색
    }, callback);
}
function callback(results, status) {
    if (status === google.maps.places.PlacesServiceStatus.OK) {
        closestRestStop = results[0];
        console.log(results);
        const name = closestRestStop.name;
        const lat = closestRestStop.geometry.location.lat();
        const lng = closestRestStop.geometry.location.lng();
        document.getElementById("output").innerHTML = `
            <p>Name: ${name}</p>
            <p>Latitude: ${lat}</p>
            <p>Longitude: ${lng}</p>
        `;
        startNavigation();
    } else {
        alert("No nearby rest stop found.");
    }
}
function startNavigation() {
    if (closestRestStop) {
        const name = closestRestStop.name;
        const lat = closestRestStop.geometry.location.lat();
        const lng = closestRestStop.geometry.location.lng();
        Kakao.Navi.start({
        name: name,
        x: lng,
        y: lat,
        coordType: 'wgs84',
        });
    }else{
        alert("No nearby rest stop found.");
    }
}

/*-----------------------------------------------------------------*/
//현재 위치 받아오는 함수
  function getLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(showPos);
    } else {

    }
  }

  function showPos(position) {
    current_lat = position.coords.latitude;
    current_lon = position.coords.longitude;
  }
  /*-----------------------------------------------------------------*/
