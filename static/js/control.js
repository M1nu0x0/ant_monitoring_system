import { drawGaugeChart } from './gaugeChart.js';

const boards = [
    { boardId: "board2", sensors: ["temperature", "fan", "heat_pad"] },
    { boardId: "board1", sensors: ["food_weight", "food_motor"] },
    { boardId: "board3", sensors: ["trash_weight", "water_pump", "humidity", "humidity_motor"] },
];

let intervalId = null;
const updateInterval = 100;

const sendCommandToServer = (sensor, action) => {
    // console.log(`sensor: ${sensor}, action: ${action}`);
    const board = boards.find(board => board.sensors.includes(sensor)).boardId;
    fetch(`/command/${board}/${sensor}/${action}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ value: action })
    });
    // }).then(response => {
    //     if (!response.ok) {
    //         console.error(`Failed to send command for ${sensor}`);
    //     }
    // }).catch(error => console.error(`Error sending command: ${error}`));
};

document.addEventListener("DOMContentLoaded", () => {
    // 실시간 데이터 가져오기 함수
    let sensorDatas = {
        fan: "False",
        food_motor: "False",
        food_weight: "0",
        heat_pad: "False",
        humidity: "0",
        humidity_motor: "False",
        temperature: "0",
        trash_weight: "0",
        water_pump: "False",
    };

    const updateSensorData = (sensor, data) => {
        sensorDatas[`${sensor}`] = data;
        const sensorElement = document.getElementById(`${sensor}`);
        if (sensorElement) {
            sensorElement.textContent = data;
        }
        if (isAutoMode) {
            // console.log(sensor, data);
            if (sensor == "fan" && data === "True") {
                // 환풍기가 돌고있어도 안 돈 것처럼 세팅
                fanConfig.isFanOn = false;
                fanConfig.currentRPS = fanConfig.maxRPS;
                fanConfig.inner.classList.remove("spin");
                fanConfig.toggleElement.textContent = "Turn On";
                fanConfig.toggleElement.click();
                // console.log("fan");
            }
            if (sensor === "heat_pad" && data === "True") {
                // 열선패드가 돌고있어도 안 돈 것처럼 세팅
                heatPadConfig.isHeatOn = false;
                heatPadConfig.img.classList.toggle("glow");
                heatPadConfig.toggleElement.textContent = "Turn On";
                heatPadConfig.toggleElement.click();
                // console.log("heat_pad");
            }
            if (sensor === "food_motor" && data === "True") {
                // 먹이 모터가 돌고있어도 안 돈 것처럼 세팅
                // foodMotorConfig.clicked = false;
                foodMotorConfig.isCoolingDown = false;
                foodMotorConfig.top = 0;
                foodMotorConfig.img.style.top = "0px";
                foodMotorConfig.toggleElement.disabled=false;
                foodMotorConfig.toggleElement.textContent = "Activate";
                foodMotorConfig.toggleElement.click();
                // console.log("food_motor");
            }
            if (sensor === "water_pump" && data === "True") {
                // 워터 펌프가 돌고있어도 안 돈 것처럼 세팅
                // waterPumpConfig.clicked = !waterPumpConfig.clicked;
                waterPumpConfig.isCoolingDown = false;
                waterPumpConfig.buttonElement.disabled=false;
                waterPumpConfig.buttonElement.textContent = "Activate";
                // waterPumpConfig.img.classList.toggle("glow");
                waterPumpConfig.buttonElement.click();
                // console.log("water_pump");
            }
            if (sensor === "humidity_motor" && data === "True") {
                // 습도 모터가 돌고있어도 안 돈 것처럼 세팅
                // humidMotorConfig.clicked = false;
                humidMotorConfig.isCoolingDown = false;
                humidMotorConfig.top = 0;
                humidMotorConfig.img.style.top = "0px";
                humidMotorConfig.toggleElement.disabled=false;
                humidMotorConfig.toggleElement.textContent = "Activate";
                humidMotorConfig.toggleElement.click();
                // console.log("humidity_motor");
            }
        }
    };

    const fetchSensorData = async (boardId, sensor, first=false) => {
        try {
            const lastTimestamp = localStorage.getItem(`${boardId}_${sensor}_timestamp`); // 이전에 받은 timestamp 저장
            const headers = new Headers();

            if (lastTimestamp && !first) {
                headers.append("If-Modified-Since", lastTimestamp); // If-Modified-Since 헤더에 추가
            }

            const response = await fetch(`/fetch/${boardId}/${sensor}/1`, { headers });

            if (response.status === 304) {
                return; // 데이터 변경 없으면 처리 종료
            }

            const data = await response.json(); // 새로운 데이터가 있으면 JSON 응답 처리
            if (data) {
                // 데이터 처리
                updateSensorData(sensor, data.data[0].value);
                localStorage.setItem(`${boardId}_${sensor}_timestamp`, data.data[0].timestamp); // 최신 timestamp 저장
            }
        } catch (error) {
            // console.error(`Error fetching data for ${sensor}:`, error);
            return; // 에러 발생 시
        }
    };

    const fetchAllSensorData = async (first=false) => {
        for (const board of boards) {
            for (const sensor of board.sensors) {
                await fetchSensorData(board.boardId, sensor, first);
            }
        }
    };

    fetchAllSensorData(true);
    intervalId = setInterval(fetchAllSensorData, updateInterval);

    const root = document.documentElement;

    // 자동모드
    const AutoSwitch = document.getElementById("autoSwitch");
    const buttons = document.querySelectorAll(".btn:not(#autoSwitch)");
    const initialButtonStates = [...buttons].map((button) => ({
        element: button,
        isInitiallyDisabled: button.disabled
    }));

    let isAutoMode = AutoSwitch.checked;

    // 환풍기 제어
    // sensorDatas.fan에 따라 환풍기 제어 추가 단, 버튼을 누르면 서버로 명령 전송
    // True 명령은 센서 이름을 서버로 보내면 됨
    const fanConfig = {
        toggleElement: document.getElementById("fanToggle"),
        inner: document.getElementById("fanInner"),
        fps: 24,
        targetInterval: 1000 / 24,
        isFanOn: false,
        maxRPS: 2,
        minRPS: 0.5,
        decayRPS: 0.1,
        currentRPS: 2,
        lastUpdateTime: 0,
        animationFrameId: null,
    };

    fanConfig.toggleElement.addEventListener("click", () => {
        fanConfig.isFanOn = !fanConfig.isFanOn;

        if (fanConfig.animationFrameId) {
            cancelAnimationFrame(fanConfig.animationFrameId);
        }

        if (fanConfig.isFanOn) {
            fanConfig.currentRPS = fanConfig.minRPS; // 초기 RPS 설정
            fanConfig.inner.classList.add("spin");
            fanConfig.toggleElement.textContent = "Turn Off";
            if (!isAutoMode) {
                sendCommandToServer("fan", "1");
            }

            const accelerateFan = (time) => {
                if (time - fanConfig.lastUpdateTime >= fanConfig.targetInterval) {
                    fanConfig.lastUpdateTime = time;

                    if (fanConfig.currentRPS < fanConfig.maxRPS) {
                        fanConfig.currentRPS += fanConfig.decayRPS; // 초당 회전수 증가
                        fanConfig.inner.style.animationDuration = `${1 / fanConfig.currentRPS}s`; // RPS에 맞는 duration
                    } else {
                        cancelAnimationFrame(fanConfig.animationFrameId);
                        return; // 애니메이션 종료
                    }
                }
                fanConfig.animationFrameId = requestAnimationFrame(accelerateFan);
            };

            fanConfig.animationFrameId = requestAnimationFrame(accelerateFan);
        } else {
            fanConfig.currentRPS = fanConfig.maxRPS; // 초기 RPS 설정
            fanConfig.toggleElement.textContent = "Turn On";
            if (!isAutoMode) {
                sendCommandToServer("fan", "0");
            }

            const decelerateFan = (time) => {
                if (time - fanConfig.lastUpdateTime >= fanConfig.targetInterval) {
                    fanConfig.lastUpdateTime = time;

                    if (fanConfig.currentRPS > fanConfig.minRPS) {
                        fanConfig.currentRPS -= fanConfig.decayRPS; // 초당 회전수 감소
                        fanConfig.inner.style.animationDuration = `${1 / fanConfig.currentRPS}s`; // RPS에 맞는 duration
                    } else {
                        cancelAnimationFrame(fanConfig.animationFrameId);
                        fanConfig.inner.classList.remove("spin");
                        return; // 애니메이션 종료
                    }
                }
                fanConfig.animationFrameId = requestAnimationFrame(decelerateFan);
            };

            fanConfig.animationFrameId = requestAnimationFrame(decelerateFan);
        }
    });


    // 온도계
    const tempConfig = {
        dimensions: { width: 120, height: 120, padding: 15 },
        value: sensorDatas.temperature || 0,
        interval: 700,
        minValue: -40,
        maxValue: 79,
        colorList: ['#FEFEFE', '#FEA0A0', '#FF0000'],
        labelStep: 30,
        labelOffset: 21,
        valueFontSize: '22px',
        unitString: '°C',
    };
    drawGaugeChart('temperatureChart', tempConfig);
    setInterval(() => {
        // sensorDatas.temperature = Math.floor(Math.random() * 120) - 40;
        tempConfig.previousValue = tempConfig.value;
        tempConfig.value = sensorDatas.temperature || 80;
        drawGaugeChart('temperatureChart', tempConfig);
    }, updateInterval);


    // 습도계
    const humidConfig = {
        dimensions: { width: 120, height: 120, padding: 15 },
        value: sensorDatas.humidity || 100,
        interval: 700,
        minValue: 0,
        maxValue: 99,
        colorList: ['#FF0000', '#FFFF00', '#FFFF00', '#FFFF00', '#00FF00', '#FFFF00', '#FFFF00', '#FF0000'],
        labelStep: 20,
        labelOffset: 21,
        valueFontSize: '22px',
        unitString: '%',
    };
    drawGaugeChart('humidityChart', humidConfig);
    setInterval(() => {
        // sensorDatas.humidity = Math.floor(Math.random() * 100);
        humidConfig.previousValue = humidConfig.value;
        humidConfig.value = sensorDatas.humidity || 0;
        drawGaugeChart('humidityChart', humidConfig);
    }, updateInterval);


    // 습도 모터
    const humidMotorConfig = {
        // clicked: sensorDatas.humidity_motor === "True",
        toggleElement: document.getElementById("humidityMotorButton"),
        img: document.getElementById("humidityMotorImg"),
        top: 0,
        containerHeight: 120,
        containerWidth: 120,
        imgHeight: 120 * 0.7,
        imgWidth: 120 * 0.7,
        step: 50,
        interval: 100,
        totalTime: 5000,
        isCoolingDown: false,
        animationId: null,
    };
    humidMotorConfig.toggleElement.addEventListener("click", () => {
        // humidMotorConfig.clicked = !humidMotorConfig.clicked;
        humidMotorConfig.isCoolingDown = true;
        humidMotorConfig.toggleElement.disabled=true;
        humidMotorConfig.toggleElement.textContent = "Cool Down";
        if (!isAutoMode) {
            sendCommandToServer("humidity_motor", "1");
        }

        const start = Date.now();

        const dropWater = () => {
            const elapsed = Date.now() - start;

            if (elapsed > humidMotorConfig.totalTime) {
                // end cooldown
                humidMotorConfig.isCoolingDown = false;
                humidMotorConfig.top = 0;
                humidMotorConfig.img.style.top = "0px";
                humidMotorConfig.toggleElement.textContent = "Activate";

                // automode
                if (!isAutoMode) {
                    humidMotorConfig.toggleElement.disabled=false;
                }
                else
                    humidMotorConfig.toggleElement.disabled=true;
                return;
            }
            
            if (humidMotorConfig.top < humidMotorConfig.containerHeight) {
                humidMotorConfig.top += humidMotorConfig.step;
            } else {
                humidMotorConfig.top = -humidMotorConfig.imgHeight;
            }
            humidMotorConfig.img.style.top = `${humidMotorConfig.top}px`;

            humidMotorConfig.animationId = setTimeout(dropWater, humidMotorConfig.interval);
        };
        dropWater();
    });


    // 열선패드
    const heatPadConfig = {
        isHeatOn: sensorDatas.heat_pad === "True",
        toggleElement: document.getElementById("heatPadToggle"),
        img: document.getElementById("heatPadInner"),
    };
    heatPadConfig.toggleElement.addEventListener("click", () => {
        heatPadConfig.isHeatOn = !heatPadConfig.isHeatOn;
        heatPadConfig.toggleElement.textContent = heatPadConfig.isHeatOn ? "Turn Off" : "Turn On";
        heatPadConfig.img.classList.toggle("glow");
        if (!isAutoMode) {
            sendCommandToServer("heat_pad", heatPadConfig.isHeatOn ? "1" : "0");
        }
    });


    // 워터 펌프
    const waterPumpConfig = {
        // clicked: sensorDatas.water_pump === "True",
        buttonElement: document.getElementById("waterPumpButton"),
        img: document.getElementById("waterPumpInner"),
        isCoolingDown: false,
    };
    waterPumpConfig.buttonElement.addEventListener("click", () => {
        // waterPumpConfig.clicked = !waterPumpConfig.clicked;
        waterPumpConfig.isCoolingDown = true;
        waterPumpConfig.buttonElement.disabled=true;
        waterPumpConfig.buttonElement.textContent = "Cool Down";
        waterPumpConfig.img.classList.toggle("glow");
        if (!isAutoMode) {
            sendCommandToServer("water_pump", "1");
        }
        setTimeout(() => {
            waterPumpConfig.isCoolingDown = false;
            waterPumpConfig.buttonElement.textContent = "Activate";
            waterPumpConfig.img.classList.toggle("glow");

            if (!isAutoMode)
                waterPumpConfig.buttonElement.disabled=false;
            else
                waterPumpConfig.buttonElement.disabled=true
        }, 1000);
    });


    // 먹이 무게
    const foodWeightConfig = {
        // foodWeightElement: document.getElementById("food_weight"),
        value: sensorDatas.food_weight || 0,
        size: 100,
    };
    setInterval(() => {
        foodWeightConfig.value = sensorDatas.food_weight || 0;
        if (foodWeightConfig.value <= 3) {
            // 10%
            foodWeightConfig.size = 50;
        }
        else if (foodWeightConfig.value <= 10) {
            // 30%
            foodWeightConfig.size = 70;
        }
        else if (foodWeightConfig.value <= 30) {
            // 70%
            foodWeightConfig.size = 88;
        }
        else {
            // 가득
            foodWeightConfig.size = 100;
        }
        root.style.setProperty("--food-size", `${foodWeightConfig.size}%`);
    }, updateInterval);


    // 쓰레기장 무게
    const trashWeightConfig = {
        trashImg: document.getElementById("trashImg"),
        value: sensorDatas.trash_weight || 0,
        size: 100,
    };
    setInterval(() => {
        trashWeightConfig.value = sensorDatas.trash_weight || 0;
        // trashWeightConfig.value = Math.random() * 100;
        // let sensor_value = document.getElementById("trash_weight");
        // sensor_value.textContent = trashWeightConfig.value;
        if (trashWeightConfig.value <= 30) {
            // 30%
            trashWeightConfig.size = 88;
            trashWeightConfig.trashImg.src = "/static/images/trash_low.png";
        }
        else if (trashWeightConfig.value <= 60) {
            // 70%;
            trashWeightConfig.size = 100;
            trashWeightConfig.trashImg.src = "/static/images/trash_low.png";
        }
        else {
            // 가득
            trashWeightConfig.size = 100;
            trashWeightConfig.trashImg.src = "/static/images/trash_high.png";
        }
        root.style.setProperty("--trash-size", `${trashWeightConfig.size}%`);
    }, updateInterval);


    // 먹이 모터
    const foodMotorConfig = {
        // clicked: sensorDatas.food_motor === "True",
        toggleElement: document.getElementById("foodMotorButton"),
        img: document.getElementById("dispenserImg"),
        top: 0,
        containerHeight: 120,
        containerWidth: 120,
        imgHeight: 120 * 0.7,
        imgWidth: 120 * 0.7,
        step: 50,
        interval: 100,
        totalTime: 3000,
        isCoolingDown: false,
        animationId: null,
    };
    foodMotorConfig.toggleElement.addEventListener("click", () => {
        // foodMotorConfig.clicked = !foodMotorConfig.clicked;
        foodMotorConfig.toggleElement.disabled=true;
        foodMotorConfig.toggleElement.textContent = "Cool Down";
        if (!isAutoMode) {
            sendCommandToServer("food_motor", "1");
        }

        const start = Date.now();

        const dropFood = () => {
            const elapsed = Date.now() - start;

            if (elapsed > foodMotorConfig.totalTime) {
                // end cooldown
                foodMotorConfig.isCoolingDown = false;
                foodMotorConfig.top = 0;
                foodMotorConfig.img.style.top = "0px";
                foodMotorConfig.toggleElement.textContent = "Activate";

                // automode
                if (!isAutoMode) {
                    foodMotorConfig.toggleElement.disabled=false;
                }
                else {
                    foodMotorConfig.toggleElement.disabled=true;
                }
                return;
            }
            
            if (foodMotorConfig.top < foodMotorConfig.containerHeight) {
                foodMotorConfig.top += foodMotorConfig.step;
            } else {
                foodMotorConfig.top = -foodMotorConfig.imgHeight;
            }
            foodMotorConfig.img.style.top = `${foodMotorConfig.top}px`;
            setTimeout(dropFood, foodMotorConfig.interval);
        };
        dropFood();
    });


    // 자동모드
    const handleAutoSwitch = (isChecked) => {
        initialButtonStates.forEach(({ element }) => {
            if (element === humidMotorConfig.buttonElement && humidMotorConfig.isCoolingDown) {
                return;
            }
            if (element === foodMotorConfig.toggleElement && foodMotorConfig.isCoolingDown) {
                return;
            }
            if (element === waterPumpConfig.buttonElement && waterPumpConfig.isCoolingDown) {
                return;
            }
            // console.log(isChecked);
            element.disabled = isChecked ? true : element.disabled;
        });

        if (!isChecked) {
            initialButtonStates.forEach(({ element, isInitiallyDisabled }) => {
                if (element === humidMotorConfig.buttonElement && humidMotorConfig.isCoolingDown) {
                    return;
                }
                if (element === foodMotorConfig.toggleElement && foodMotorConfig.isCoolingDown) {
                    return;
                }
                if (element === waterPumpConfig.buttonElement && waterPumpConfig.isCoolingDown) {
                    return;
                }
                element.disabled = isInitiallyDisabled;
            });
        }
    };
    AutoSwitch.addEventListener("change", (event) => {
        isAutoMode = event.target.checked;

        if (event.target.checked) {
            // sendCommandToServer("auto", "1");
            fetch("/command/board1/auto/1", {method: "POST"});
            fetch("/command/board2/auto/1", {method: "POST"});
            fetch("/command/board3/auto/1", {method: "POST"});
            // if (fanConfig.isFanOn) {
            //     fanConfig.toggleElement.click();
            // }
            // if (heatPadConfig.isHeatOn) {
            //     heatPadConfig.toggleElement.click();
            // }
        }

        handleAutoSwitch(event.target.checked);

        [humidMotorConfig, foodMotorConfig, waterPumpConfig].forEach((config) => {
            if (config.isCoolingDown) {
                config.toggleElement.disabled = true;
            }
        });
    });
    handleAutoSwitch(AutoSwitch.checked);
});

window.addEventListener("beforeunload", () => {
    clearInterval(intervalId);
});
