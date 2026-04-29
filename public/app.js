//Show all jaguars
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

let jaguarStream = null;

function startJaguarStream() {
    const jaguarId = document.getElementById('jaguarIdMov').value.trim().toUpperCase(); 
    const output = document.getElementById('output');

    if(!jaguarId || jaguarId === '') {
        output.textContent = 'Please enter a Jaguar ID';
        return;
    }

    jaguarStream = new EventSource(`/api/jaguars/${jaguarId}/stream`);

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

    jaguarStream.onerror = (error) => {
        console.error('Error in jaguar stream:', error);
        output.textContent = 'Error in jaguar stream.';
        jaguarStream.close();
    };  
}

function stopJaguarStream() {
    if (jaguarStream) {
        jaguarStream.close();
        jaguarStream = null;
    }
}

//Get current conditions
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

        // set new values
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


async function sendAlert(){
    const alertType = document.getElementById("alertType").value;
    const severity = document.getElementById("severity").value;
    const region = document.getElementById("region").value.trim();
    const textArea = document.getElementById("messageInput");
    const output = document.getElementById("outputAlert");  
    console.log(`Sending alert: Type=${alertType}, Severity=${severity}, Region=${region}, Message=${textArea.value}`);
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

async function startLiveAlertChat() {
    const output = document.getElementById("outputAlert");
    output.textContent = "Starting live alert chat...\n";                         
    try {
        const eventSource = new EventSource('/api/alerts/live');   
        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            output.textContent += `Live Alert Update: ${data.message}\n`;
        };

        eventSource.onerror = (error) => {
            console.error('Error in live alert chat:', error);
            output.textContent += 'Error in live alert chat.\n';
            eventSource.close();
        };
    } catch (error) {
        console.error('Error starting live alert chat:', error);
        output.textContent = 'Error starting live alert chat.';
    }   
}
