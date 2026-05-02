// Discover all services registered in the naming service
async function discoverServices() {
    try {
        const response = await fetch('/api/services');
        const services = await response.json();
        return services;
    } catch (error) {
        console.error('Error discovering services:', error);
        throw new Error('Failed to discover services');
    }
}

// Get and display all jaguars from the backend
async function showAllJaguars() {
    const output = document.getElementById('output');
    try {       
        const response = await fetch('/api/jaguars');
        const data = await response.json();
        
        output.innerHTML =`
        <h5>All Jaguars</h5>
        ${data.map(j => 
            `<p>ID: ${j.jaguarId}</p>
            <p>Name: ${j.name}</p>
            <p>Lat: ${j.latitude}</p>
            <p>Lon: ${j.longitude}</p>
            <p>Time: ${j.timestamp}</p>`
        ).join('\n')}`;       
    
    } catch (error) {
        console.error('Error fetching jaguars:', error);
        output.textContent = 'Error loading jaguars.';
    }
}

//Get location of jaguar by ID
async function getJaguarLocation() {
    const output = document.getElementById('output');
    output.textContent = 'Loading jaguar location...';

    const jaguarId = document.getElementById('jaguarId').value.trim().toUpperCase(); 

    if(!jaguarId) {
        output.textContent = 'Please enter a Jaguar ID';
        return;
    }

    try {
        const response = await fetch(`/api/jaguars/${jaguarId}`);

        if(!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Jaguar not found');
        }
        const data = await response.json();

        output.innerHTML =`
            <p>ID: ${data.jaguarId}</p>
            <p>Name: ${data.name}</p>
            <p>Lat: ${data.latitude}</p>
            <p>Lon: ${data.longitude}</p>
            <p>Time: ${data.timestamp}</p>
        `;
    } catch (error) {
        console.error('Error fetching jaguar location:', error);
        output.textContent = 'Jaguar not found, try a different ID.';
    }   
}

// Store the jaguar movement stream connection
let jaguarStream = null;

// Start server streaming for jaguar movement
function startJaguarStream() {
    const jaguarId = document.getElementById('jaguarIdMov').value.trim().toUpperCase(); 
    const output = document.getElementById('output');

    if(!jaguarId || jaguarId === '') {
        output.textContent = 'Please enter a Jaguar ID';
        return;
    }
    // Open stream connection to backend
    jaguarStream = new EventSource(`/api/jaguars/${jaguarId}/stream`);

    // Display every location update received from the stream
    jaguarStream.onmessage = (event) => {
        const data = JSON.parse(event.data);
        output.innerHTML =`
            <p>ID: ${data.jaguarId}</p>
            <p>Name: ${data.name}</p>
            <p>Lat: ${data.latitude}</p>
            <p>Lon: ${data.longitude}</p>
            <p>Time: ${data.timestamp}</p>
        `;
    };

    // Close stream if an error happens
    jaguarStream.onerror = (error) => {
        console.error('Error in jaguar stream:', error);
        output.textContent = 'Error in jaguar stream.';
        jaguarStream.close();
    };  
}
//Stop streaming jaguar location updates
function stopJaguarStream() {
    if (jaguarStream) {
        jaguarStream.close();
        jaguarStream = null;
    }
}

// Get current Pantanal conditions using one temperature input
async function getCurrentConditions(){
    const temperature = Number(document.getElementById("temperature").value);

    const outputTemperature = document.getElementById("outputTemperature");
    const outputHumidity = document.getElementById("outputHumidity");
    const outputRainfall = document.getElementById("outputRainfall");
    const outputFireRisk = document.getElementById("outputFireRisk");

    if(isNaN(temperature)){
        window.alert("Please insert a number");
        return;
    }

    try{
        const response = await fetch(`/api/weather?temperature=${temperature}`);
        
        if(!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Error getting weather data");
        }

        const data = await response.json();
        
         // Select colour based on fire risk
        let textColor;

        if (data.fireRisk === 'HIGH') {
            textColor = 'text-danger';
        } else if (data.fireRisk === 'MEDIUM') {
            textColor = 'text-warning';
        } else {
            textColor = 'text-success';
        }

        // clear old values
        outputTemperature.textContent = "";
        outputHumidity.textContent = "";
        outputRainfall.textContent = "";

        // Display weather results
        outputTemperature.textContent = `${data.temperature}°C`;
        outputHumidity.textContent = `${data.humidity}%`;
        outputRainfall.textContent = `${data.rainfall}mm`;

        outputFireRisk.textContent = data.fireRisk;
        outputFireRisk.className = `mb-0 ${textColor}`;
        

    } catch(error){
        console.error('Error getting the current conditions:', error);
        window.alert(error.message);
    }
}

// Send multiple temperature readings to the backend for client streaming analysis
async function sendSensorDataBatch() {
    const input = document.getElementById("tempInput").value;
    const output = document.getElementById("outputBatch");
   
    // Convert comma-separated input into numbers
    const readings = input.split(',').map(s => s.trim()).filter(s => s !== '').map(Number);

    if (readings.length === 0 || readings.some(r => isNaN(r))) {
        window.alert("Please enter valid numbers separated by commas");
        return;
    }

    try {
        const response = await fetch('/api/weather/batch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ readings })
        });
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || "Error analyzing batch data");
        }
        
        // Display summary calculated by the service
        output.innerHTML = `
            <p>Average Temperature: ${data.averageTemperature.toFixed(2)}°C</p>
            <p>Average Humidity: ${data.averageHumidity}%</p>
            <p>Average Rainfall: ${data.averageRainfall}mm</p>
            <p>Fire Risk: ${data.fireRisk}</p>
        `;
    } catch (error) {
        console.error('Error analyzing batch data:', error);
        window.alert('Error analyzing batch data.');
    }


}

// Send an alert and display the recommended action
async function sendAlert(){
    const alertType = document.getElementById("alertType").value;
    const severity = document.getElementById("severity").value;
    const region = document.getElementById("region").value.trim();
    const textArea = document.getElementById("messageInput");
    const output = document.getElementById("outputAlert");  
   
    try{
        const response = await fetch('/api/alerts', {  
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ alertType, severity, region, message: textArea.value })
        });

        const data = await response.json();
        if(!response.ok) {
            throw new Error(data.error || "Error sending alert");
        }
        
        output.textContent = `Alert sent successfully: ${data.recommendationAction}`;
        textArea.value = ""; // Clear the textarea after sending
    } catch(error){
        console.error('Error sending alert:', error);
        output.textContent = `Error sending alert: ${error.message}`;
    }
}

// Store the live alert stream connection
let alertStream = null;

// Start live alert stream for real-time alert messages
async function startLiveAlertChat() {
    const output = document.getElementById("outputAlert");
    output.textContent = "Starting live alert chat...\n";   
    try {
        // Open stream connection to backend
        alertStream = new EventSource('/api/alerts/live');

        // Display each live alert message  
        alertStream.onmessage = (event) => {
            const data = JSON.parse(event.data);
            output.innerHTML = `<p>Live Alert Update: ${data.message}</p>`;
        };
        
        // Close stream if an error happens
        alertStream.onerror = (error) => {
            console.error('Error in live alert chat:', error);
            output.innerHTML += "<p>Error in live alert chat.</p>";
            alertStream.close();
        };
    } catch (error) {
        console.error('Error starting live alert chat:', error);
        output.textContent = 'Error starting live alert chat.';
    }   
}
//Stop live alert chat
function stopLiveAlertChat() {
    if (alertStream) {
        alertStream.close();
        alertStream = null;

        const output = document.getElementById("outputAlert");
        output.innerHTML += "<p>Live alert chat stopped.</p>";
        setTimeout(() => {
            output.textContent = "";
        }, 5000);
    } 
}
