document.addEventListener('DOMContentLoaded', () => {
  const boardTableBodies = {
    board1: document.getElementById('board1-table-body'),
    board2: document.getElementById('board2-table-body'),
    board3: document.getElementById('board3-table-body'),
  };

  const tableBtn = document.getElementById('table-btn');
  const chartBtn = document.getElementById('chart-btn');
  const chartDiv = document.getElementById('data-chart');
  const tableDiv = document.getElementById('data-table-container');
  const dataCountInput = document.getElementById('data-count-input');
  const dataCountBtn = document.getElementById('data-count-btn');
  const chartContainer = document.getElementById('chart-container');

  // 센서와 UI 이름 매핑
  const sensorOrder = [
    { db: "temperature", ui: "Temperature (°C)" },
    { db: "humidity", ui: "Humidity (%)" },
    { db: "trash_weight", ui: "Trash Weight (g)" },
    { db: "food_weight", ui: "Food Weight (g)" },
    { db: "fan", ui: "Fan Status" },
    { db: "heat_pad", ui: "Heat Pad Status" },
    { db: "water_pump", ui: "Water Pump Status" },
    { db: "humidity_motor", ui: "Humidity Motor Status" },
    { db: "food_motor", ui: "Food Motor Status" },
  ];

  async function fetchAllData(n = 20) {
    try {
      const response = await fetch(`/fetch_all_datas/${n}`);
      if (!response.ok) throw new Error("Failed to fetch data");

      const data = await response.json();
      return data.status === "success" ? data.data : [];
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  function processBooleanData(value) {
    return value === "True" ? 1.0 : 0.0;
  }

  function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toISOString().slice(0, 19).replace('T', ' ');
  }

  function renderTables(data) {
    Object.values(boardTableBodies).forEach(body => (body.innerHTML = ""));
    data.forEach(row => {
      const [board, sensor] = row.table.split('_');
      const tableBody = boardTableBodies[board];
      if (tableBody) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${formatTimestamp(row.timestamp)}</td><td>${sensor}</td><td>${row.value}</td>`;
        tableBody.appendChild(tr);
      }
    });
  }

  function renderCharts(data) {
    chartContainer.innerHTML = "";

    sensorOrder.forEach(({ db, ui }) => {
      const sensorData = data.filter(row => row.table.includes(db));
      let labels = sensorData.map(row => formatTimestamp(row.timestamp));
      let values;

      if (["fan", "heat_pad", "water_pump", "humidity_motor", "food_motor"].includes(db)) {
        values = sensorData.map(row => processBooleanData(row.value));
      } else {
        values = sensorData.map(row => parseFloat(row.value));
      }

      // 데이터를 최신값이 오른쪽에 오도록 뒤집음
      labels = labels.reverse();
      values = values.reverse();

      if (labels.length === 0) {
        labels.push("No Data");
        values = [0];
      }

      const sensorContainer = document.createElement('div');
      sensorContainer.classList.add('sensor-container');
      sensorContainer.innerHTML = `<h3>${ui}</h3>`;
      chartContainer.appendChild(sensorContainer);

      const canvas = document.createElement('canvas');
      sensorContainer.appendChild(canvas);

      new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: ui,
            data: values,
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderWidth: 1,
          }],
        },
        options: {
          responsive: true,
        },
      });
    });
  }

  async function loadData(n = 20) {
    const data = await fetchAllData(n);
    renderTables(data);
    renderCharts(data);
  }

  dataCountBtn.addEventListener('click', () => {
    const count = parseInt(dataCountInput.value, 10);
    if (isNaN(count) || count <= 0) {
      alert("Please enter a valid number greater than 0.");
      return;
    }
    loadData(count);
  });

  tableBtn.addEventListener('click', () => {
    tableDiv.style.display = 'flex';
    chartDiv.style.display = 'none';
  });

  chartBtn.addEventListener('click', () => {
    tableDiv.style.display = 'none';
    chartDiv.style.display = 'block';
  });

  loadData(); // 기본 데이터 로드
});
