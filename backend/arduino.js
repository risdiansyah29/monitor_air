const { SerialPort, ReadlineParser } = require('serialport');
const db = require('./db');
require('dotenv').config({ override: true });

module.exports = (app) => {
  const io = app.get('io');
  const portName = process.env.SERIAL_PORT || 'COM3';
  const baudRate = parseInt(process.env.SERIAL_BAUD_RATE) || 9600;
  const isSimulation = process.env.SIMULATE_ARDUINO === 'true';

  let port;

  if (!isSimulation) {
    console.log(`Attempting to connect to Serial Port: ${portName} at ${baudRate} baud...`);
    port = new SerialPort({ path: portName, baudRate: baudRate }, (err) => {
      if (err) {
        console.error(`[SerialPort Error] Could not open port ${portName}:`, err.message);
        SerialPort.list().then(ports => {
          if (ports.length > 0) {
            console.log('=========================================');
            console.log('Available USB/Serial Ports on your system:');
            ports.forEach(p => {
              console.log(`  * ${p.path} (${p.friendlyName || p.manufacturer || 'Device'})`);
            });
            console.log(`\nSilakan ubah SERIAL_PORT di file backend/.env menjadi salah satu port di atas.`);
            console.log('=========================================');
          } else {
            console.log('Tidak ada perangkat USB Serial/Arduino aktif yang terdeteksi. Silakan hubungkan Arduino Anda.');
          }
          console.log('Falling back to SIMULATION mode...');
          startSimulation();
        }).catch(listErr => {
          console.error('Error listing serial ports:', listErr.message);
          console.log('Falling back to SIMULATION mode...');
          startSimulation();
        });
      } else {
        console.log(`Connected to Serial Port: ${portName}`);
      }
    });

    port.on('open', () => {
      port.on('data', (data) => {
        // console.log('Raw bytes from Arduino:', data.toString());
      });
      const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
      
      parser.on('data', (data) => {
        // Expected format from Arduino: "distance,water_percentage,status,buzzer_status"
        // Example: "15.5,75.0,Aman,OFF"
        processData(data);
      });
    });

    app.on('toggleBuzzer', (isMuted) => {
      if (port && port.isOpen) {
        // Send 'M' for mute, 'U' for unmute
        const cmd = isMuted ? 'M' : 'U';
        port.write(cmd + '\n');
      }
    });

    port.on('error', (err) => {
      console.error('Serial Port Error: ', err.message);
    });
  } else {
    console.log('Starting Arduino simulation mode...');
    startSimulation();
  }

  async function processData(dataString) {
    try {
      const parts = dataString.split(',');
      if (parts.length >= 4) {
        const distance = parseFloat(parts[0]);
        const water_percentage = parseFloat(parts[1]);
        const status = parts[2].trim();
        const buzzer_status = parts[3].trim();

        if (!isNaN(distance) && !isNaN(water_percentage)) {
          // Save to database
          const [rows] = await db.query(
            'INSERT INTO sensor_data (distance, water_percentage, status, buzzer_status) VALUES (?, ?, ?, ?) RETURNING id',
            [distance, water_percentage, status, buzzer_status]
          );

          const newData = {
            id: rows[0]?.id || Date.now(),
            distance,
            water_percentage,
            status,
            buzzer_status,
            created_at: new Date()
          };

          // Broadcast to connected clients
          io.emit('sensorData', newData);
          console.log('Data processed & broadcasted:', newData);
        }
      }
    } catch (error) {
      console.error('Error processing Arduino data:', error);
    }
  }

  function startSimulation() {
    let currentWaterPercentage = 50;
    
    setInterval(() => {
      // Randomly fluctuate water level
      const change = (Math.random() * 10) - 4; // Between -4 and +6
      currentWaterPercentage += change;
      
      if (currentWaterPercentage > 100) currentWaterPercentage = 100;
      if (currentWaterPercentage < 0) currentWaterPercentage = 0;

      // Tank depth is let's say 100cm.
      // So distance = 100 - water_percentage
      const distance = 100 - currentWaterPercentage;

      let status = 'Kosong';
      let buzzer_status = 'ON';

      if (currentWaterPercentage >= 75) {
        status = 'Penuh';
        buzzer_status = 'ON';
      } else if (currentWaterPercentage >= 40) {
        status = 'Sedang';
        buzzer_status = 'OFF';
      } else if (currentWaterPercentage >= 15) {
        status = 'Rendah';
        buzzer_status = 'ON';
      }

      const simulatedData = `${distance.toFixed(1)},${currentWaterPercentage.toFixed(1)},${status},${buzzer_status}`;
      processData(simulatedData);
    }, 3000); // Send data every 3 seconds
  }
};
