import React, { useState, useEffect, useCallback } from "react";
import Amplify, { PubSub } from "aws-amplify";
import { AWSIoTProvider } from "@aws-amplify/pubsub/lib/Providers";
import { Line } from "@reactchartjs/react-chart.js";

import Grid from "@material-ui/core/Grid";
import Container from "@material-ui/core/Container";

Amplify.configure({
  Auth: {
    identityPoolId: "us-east-1:e5160ce0-f31f-43da-b7d8-bf8627b97492",
    region: "us-east-1",
    userPoolId: "us-east-1_1iKOcg4Lr",
    userPoolWebClientId: "23of5650uckmsd4i9c9f45bo70",
  },
});

Amplify.addPluggable(
  new AWSIoTProvider({
    aws_pubsub_region: "us-east-1",
    aws_pubsub_endpoint: `wss://awfs3en17d9jm-ats.iot.us-east-1.amazonaws.com/mqtt`,
  })
);

const THING_NAME_ONE = "test";
const THING_NAME_TWO = "test";

const dataSet = (monitor) => {
  let labels = [];
  let tempData = [];
  let humidData = [];

  monitor.forEach((data) => {
    labels.push(data.labels);
    tempData.push(data.temp);
    humidData.push(data.humid);
  });

  return {
    labels: labels,
    datasets: [
      {
        label: "Temperature",
        data: tempData,
        fill: false,
        backgroundColor: "rgb(255, 99, 132)",
        borderColor: "rgba(255, 99, 132, 0.2)",
        yAxisID: "y-axis-1",
      },
      {
        label: "Humidity",
        data: humidData,
        fill: false,
        backgroundColor: "rgb(54, 162, 235)",
        borderColor: "rgba(54, 162, 235, 0.2)",
        yAxisID: "y-axis-2",
      },
    ],
  };
};

const options = {
  scales: {
    xAxes: [{ display: false }],
    yAxes: [
      {
        type: "linear",
        display: true,
        position: "left",
        id: "y-axis-1",
        ticks: {
          min: 10,
          max: 40,
        },
      },
      {
        type: "linear",
        display: true,
        position: "right",
        id: "y-axis-2",
        gridLines: {
          drawOnArea: false,
        },
        ticks: {
          min: 0,
          max: 100,
        },
      },
    ],
  },
};

const App = () => {
  // Gunma States
  const [gunmaConnection, setGunmaConnection] = useState(false);
  const [gunmaLED, setGunmaLED] = useState(false);
  const [gunmaPushedTime, setGunmaPushedTime] = useState("Not Pushed @ Gunma");
  const [gunmaMonitor, setGunmaMonitor] = useState([]);

  // Tokyo States
  const [tokyoConnection, setTokyoConnection] = useState(false);
  const [tokyoLED, setTokyoLED] = useState(false);
  const [tokyoPushedTime, setTokyoPushedTime] = useState("Not Pushed @Tokyo");
  const [tokyoMonitor, setTokyoMonitor] = useState([]);

  // Topic Subscribe
  useEffect(() => {
    // Push - Sub
    const sub_push = PubSub.subscribe([
      "Sensor/gunma/push", // メッセージペイロード例: { "push_gunma": "2021-04-04 12:32:33" }
      "Sensor/tokyo/push",
    ]).subscribe({
      next: (data) => {
        if (data.value.push_gunma) {
          setGunmaPushedTime(data.value.push_gunma);
        }
        if (data.value.push_tokyo) {
          setTokyoPushedTime(data.value.push_tokyo);
        }
      },
      error: (error) => console.error(error),
      close: () => console.log("Done"),
    });

    // 更新 - Sub
    const sub_update_gunma = PubSub.subscribe([
      "$aws/things/test/shadow/get/accepted",
      // "$aws/things/gunma/shadow/get/accepted",
    ]).subscribe({
      next: (data) => {
        setGunmaConnection(
          data.value.state.reported.connection == "on" ? true : false
        );
        setGunmaLED(data.value.state.reported.test.led == "on" ? true : false);
      },
      error: (error) => console.error(error),
      close: () => console.log("Done"),
    });

    // // 更新 - Sub
    // const sub_update_tokyo = PubSub.subscribe([
    //   "$aws/things/tokyo/shadow/get/accepted",
    // ]).subscribe({
    //   next: (data) => {
    //     setTokyoConnection(
    //       data.value.state.reported.connection == "on" ? true : false
    //     );
    //     setTokyoLED(data.value.state.reported.test.led == "on" ? true : false);
    //   },
    //   error: (error) => console.error(error),
    //   close: () => console.log("Done"),
    // });

    // 温湿度 - Sub
    const sub_led = PubSub.subscribe([
      "Sensor/gunma/123/monitor", // メッセージペイロード例: { "monitor_gunma": { "temp": "21", "humid": "38" } }
      "Sensor/tokyo/456/monitor",
    ]).subscribe({
      next: (data) => {
        if (data.value.monitor_gunma) {
          const prevState = [...gunmaMonitor];
          prevState.push({
            temp: parseInt(data.value.monitor_gunma.temp),
            humid: parseInt(data.value.monitor_gunma.humid),
            labels: (prevState.length + 1).toString(),
          });
          setGunmaMonitor(prevState);
          console.log(gunmaMonitor);
        }
        if (data.value.monitor_tokyo) {
          const prevState = [...tokyoMonitor];
          prevState.push({
            temp: parseInt(data.value.monitor_tokyo.temp),
            humid: parseInt(data.value.monitor_tokyo.humid),
            labels: (prevState.length + 1).toString(),
          });
          setTokyoMonitor(prevState);
          console.log(tokyoMonitor);
        }
      },
      error: (error) => console.error(error),
      close: () => console.log("Done"),
    });

    // LED/Connection - Sub
    const sub_led_connection = PubSub.subscribe([
      "$aws/things/test/shadow/update/accepted",
      // "$aws/things/gunma/shadow/update/accepted",
      // "$aws/things/tokyo/shadow/update/accepted",
    ]).subscribe({
      next: (data) => {
        // ★★★ LED
        if (
          data.value.state &&
          data.value.state.reported &&
          data.value.state.reported.test &&
          data.value.state.reported.test.led == "off"
        ) {
          setGunmaLED(false);
        } else if (
          data.value.state &&
          data.value.state.reported &&
          data.value.state.reported.test &&
          data.value.state.reported.test.led == "on"
        ) {
          setGunmaLED(true);
        }
        // ★★★ Connection
        if (
          data.value.state &&
          data.value.state.reported &&
          data.value.state.reported.connection == "off"
        ) {
          setGunmaConnection(false);
        } else if (
          data.value.state &&
          data.value.state.reported &&
          data.value.state.reported.connection == "on"
        ) {
          setGunmaConnection(true);
        }
      },
      error: (error) => console.error(error),
      close: () => console.log("Done"),
    });

    // 適切にアンサブスクライブしないリスナーが増えて同じメッセージを複数受け取ってしまうので注意
    return () => {
      sub_led.unsubscribe();
      sub_push.unsubscribe();
      sub_update_gunma.unsubscribe();
      // sub_update_tokyo.unsubscribe();
      sub_led_connection.unsubscribe();
    };
  }, [gunmaMonitor, tokyoMonitor]);

  const handleOneLED = useCallback((thingName, ledPower) => {
    const topicName = "$aws/things/" + thingName + "/shadow/update";
    PubSub.publish(topicName, {
      state: {
        desired: {
          [thingName]: {
            led: ledPower,
          },
        },
      },
    });
  }, []);

  const getCurrentState = () => {
    PubSub.publish("$aws/things/test/shadow/get", "");
    // PubSub.publish("$aws/things/gunma/shadow/get", "");
    // PubSub.publish("$aws/things/tokyo/shadow/get", "");
  };

  const handleBuzzer = (buzzerState) => {
    PubSub.publish("Sensor", { buzzer: buzzerState });
  };

  return (
    <Container maxWidth="lg" style={{ marginTop: "50px" }}>
      <Grid container spacing={8}>
        <Grid item xs={6}>
          <div>
            <div>Raspberry: Sensor/Gunma/123</div>
            <div>Connection: {gunmaConnection ? "ON" : "OFF"}</div>
            <div
              style={{ display: "flex", alignItems: "center", lineHeight: 1 }}
            >
              <span>LED: {gunmaLED ? "ON" : "OFF"}</span>
              <button
                onClick={() => handleOneLED(THING_NAME_ONE, "on")}
                style={{ marginLeft: "10px" }}
              >
                ON
              </button>
              <button
                onClick={() => handleOneLED(THING_NAME_ONE, "off")}
                style={{ marginLeft: "10px" }}
              >
                OFF
              </button>
            </div>
            <div style={{ marginBottom: "20px" }}>
              Pushed: {gunmaPushedTime}
            </div>
            <Line data={dataSet(gunmaMonitor)} options={options} />
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "15px",
              }}
            >
              <button
                style={{ padding: "5px" }}
                onClick={() => setGunmaMonitor([])}
              >
                Clear
              </button>
            </div>
          </div>
        </Grid>
        <Grid item xs={6}>
          <div>
            <div>Raspberry: Sensor/Tokyo/456</div>
            <div>Connection: ON</div>
            <div
              style={{ display: "flex", alignItems: "center", lineHeight: 1 }}
            >
              <span>LED: {tokyoLED ? "ON" : "OFF"}</span>
              <button style={{ marginLeft: "10px" }}>ON</button>
              <button style={{ marginLeft: "10px" }}>OFF</button>
            </div>
            <div style={{ marginBottom: "20px" }}>
              Pushed: {tokyoPushedTime}
            </div>
            <Line data={dataSet(tokyoMonitor)} options={options} />
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "15px",
              }}
            >
              <button
                style={{ padding: "5px" }}
                onClick={() => setTokyoMonitor([])}
              >
                Clear
              </button>
            </div>
          </div>
        </Grid>
      </Grid>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginTop: "30px",
          borderBottom: "2px solid #eaeaea",
          paddingBottom: "5px",
          marginTop: "60px",
        }}
      >
        <div style={{ width: "200px" }}>Raspberry: Sensor</div>
        <div style={{ marginRight: "20px" }}>Buzzer</div>
        <div>
          <button
            style={{ marginRight: "10px", padding: "5px", width: "50px" }}
            onClick={() => handleBuzzer("on")}
          >
            ON
          </button>
          <button
            onClick={() => handleBuzzer("off")}
            style={{ padding: "5px", width: "50px" }}
          >
            OFF
          </button>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginTop: "30px",
          borderBottom: "2px solid #eaeaea",
          paddingBottom: "5px",
        }}
      >
        <div style={{ width: "200px" }}>ファイル配信</div>
        <button style={{ marginRight: "10px", padding: "5px", width: "50px" }}>
          実行
        </button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginTop: "30px",
          borderBottom: "2px solid #eaeaea",
          paddingBottom: "5px",
        }}
      >
        <div style={{ width: "200px" }}>更新</div>
        <button
          onClick={getCurrentState}
          style={{ marginRight: "10px", padding: "5px", width: "50px" }}
        >
          実行
        </button>
      </div>
    </Container>
  );
};

export default App;
