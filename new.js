// ✅ Firebase SDK Initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, query, where, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { Timestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ✅ Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyARwWaQh...",
  authDomain: "qrscanner-b2520.firebaseapp.com",
  projectId: "qrscanner-b2520",
  storageBucket: "qrscanner-b2520.appspot.com",
  messagingSenderId: "450779840958",
  appId: "1:450779840958:web:25dc854dc5ffec5781f9ef"
};

// ✅ Initialize Firebase App and Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ✅ Function to load SKU suggestions from Firebase
async function loadSKUSuggestions(queryText) {
  if (queryText.length < 3) {
    document.getElementById('skuSuggestions').innerHTML = ''; // Hide suggestions if input is too short
    return;
  }

  try {
    const skuSuggestionsContainer = document.getElementById('skuSuggestions');
    skuSuggestionsContainer.innerHTML = ''; // Clear previous suggestions

    // Query Firestore for SKUs that match the input SKU Code
    const skuRef = collection(db, 'SKU');
    const q = query(skuRef, where('SKU Code', '>=', queryText), where('SKU Code', '<=', queryText + '\uf8ff'));
    const querySnapshot = await getDocs(q);

    let foundAny = false;

    querySnapshot.forEach((doc) => {
        const skuData = doc.data();
        
        if (skuData['SKU Code'] && skuData['SKU Code'].includes(queryText)) {
          foundAny = true;
          const suggestionItem = document.createElement('div');
          suggestionItem.classList.add('suggestion-item');
          suggestionItem.textContent = `${skuData['SKU Code']} - ${skuData['Item Name']}`;
      
          // Store attributes correctly (case-sensitive Firestore fields)
          suggestionItem.setAttribute('data-id', doc.id);
          suggestionItem.setAttribute('data-sku', skuData['SKU Code']);
          suggestionItem.setAttribute('data-item', skuData['Item Name'] || '');  
          suggestionItem.setAttribute('data-paper', skuData['Paper_code'] || '');  
          suggestionItem.setAttribute('data-category', skuData['CATEGORY'] || '');  
          suggestionItem.setAttribute('data-finish', skuData['FINISH'] || '');  
      
          skuSuggestionsContainer.appendChild(suggestionItem);
        }
      });
      
    if (!foundAny) {
      const noResults = document.createElement('div');
      noResults.textContent = 'No suggestions found';
      skuSuggestionsContainer.appendChild(noResults);
    }
  } catch (error) {
    console.error("❌ Error fetching SKU suggestions:", error);
  }
}

// ✅ Handle SKU Input (When User Types SKU)
document.getElementById("sku").addEventListener("input", function(event) {
  const queryText = event.target.value;
  loadSKUSuggestions(queryText);
});

// ✅ Handle SKU Suggestion Click (Auto-fill form fields when a suggestion is selected)
document.getElementById("skuSuggestions").addEventListener("click", function(event) {
    const clickedItem = event.target.closest(".suggestion-item");
    if (!clickedItem) return;
  
    const skuCode = clickedItem.dataset.sku;
    const itemName = clickedItem.dataset.item;
    const paperCode = clickedItem.dataset.paper;
    const thickness = clickedItem.dataset.category; 
    const finish = clickedItem.dataset.finish; 
  
    document.getElementById('sku').value = skuCode || '';
    document.getElementById('thickness').value = thickness || ''; 
    document.getElementById('size').value = extractSize(itemName) || '';
    document.getElementById('paperCode').value = paperCode || '';
    document.getElementById('finish').value = finish || ''; 
  
    document.getElementById("skuSuggestions").innerHTML = "";
  });

// ✅ Helper Function to Extract Size from Item Name
function extractSize(itemName) {
  if (!itemName) return '';
  const sizeMatch = itemName.match(/(\d+x\d+)/); // Match a pattern like 2440x1220
  return sizeMatch ? sizeMatch[0] : '';  
}

// ✅ QR Code Generation and Storing Scanned Data in 'scannedQRData'
document.getElementById("generateQR").addEventListener("click", async function () {
    const sku = document.getElementById("sku").value.trim();
    const thickness = document.getElementById("thickness").value.trim();
    const quantity = parseInt(document.getElementById("quantity").value.trim(), 10);
    const requiredQuantity = document.getElementById("requiredQuantity").value.trim();
    const partyName = document.getElementById("PARTY NAME").value.trim();

    if (!sku || !thickness || !quantity || !requiredQuantity || !partyName || quantity <= 0) {
        alert("Please fill all fields correctly before generating QR Codes.");
        return;
    }

    // Clear previous QR codes
    document.getElementById("qrContainer").innerHTML = "";

    // Create an array to store the generated QR codes
    const qrCodes = [];

    for (let i = 0; i < quantity; i++) {
        const randomCode = Math.floor(1000000 + Math.random() * 9000000); // 7-digit random number
        const uniqueID = `${sku}-${randomCode}`;

        const qrContainer = document.createElement("div");
        qrContainer.classList.add("qr-box");

        const qrTitle = document.createElement("p");
        qrTitle.textContent = "AMBA LAMINATES";
        qrTitle.style.fontWeight = "bold";

        const qrElement = document.createElement("div");
        new QRCode(qrElement, {
            text: uniqueID,
            width: 350,
            height: 100,
        });

        const qrLabel = document.createElement("p");
        qrLabel.textContent = `SKU: ${sku} | Thickness: ${thickness} | ID: ${uniqueID}`;

        qrContainer.appendChild(qrTitle);
        qrContainer.appendChild(qrElement);
        qrContainer.appendChild(qrLabel);

        document.getElementById("qrContainer").appendChild(qrContainer);

        // Prepare the QR code data for storing in Firestore
        qrCodes.push({
            sku: sku,
            thickness: thickness,
            requiredQuantity: requiredQuantity,
            scannedQty: quantity, // Assuming scanned qty equals the number of generated QR codes
            partyName: partyName,
            uniqueID: uniqueID,
            timestamp: new Date()  // Store the current timestamp for filtering
        });
    }

    try {
        const scannedQRDataRef = collection(db, 'scannedQRData'); // Use 'scannedQRData' collection

        // Query for existing entry for the SKU and party
        const existingEntryQuery = query(
            scannedQRDataRef,
            where("sku", "==", sku),
            where("partyName", "==", partyName)
        );

        const querySnapshot = await getDocs(existingEntryQuery);

        if (!querySnapshot.empty) {
            // If an entry for the SKU and party already exists, update it
            const doc = querySnapshot.docs[0]; // Only one entry per SKU-party pair
            const existingData = doc.data();

            if (existingData.scannedQty < existingData.requiredQuantity) {
                const updatedQty = existingData.scannedQty + quantity; // Increment scanned quantity

                // Check if the required quantity is reached
                if (updatedQty >= existingData.requiredQuantity) {
                    // Stop scanning for this party once the required quantity is met
                    alert(`Scanned quantity for party ${partyName} for SKU ${sku} is now complete.`);
                }

                // Update the existing entry
                await updateDoc(doc.ref, {
                    scannedQty: updatedQty,
                    timestamp: new Date(), // Update timestamp
                });

                alert(`Scanned quantity for party ${partyName} and SKU ${sku} updated!`);
            } else {
                alert(`The required quantity for this party has already been completed.`);
            }
        } else {
            // If no entry exists for this party and SKU, create a new one
            const newEntry = {
                sku: sku,
                thickness: thickness,
                requiredQuantity: requiredQuantity,
                scannedQty: quantity,
                partyName: partyName,
                timestamp: new Date(), // Store the current timestamp for filtering
            };

            // Add new entry
            await addDoc(scannedQRDataRef, newEntry);

            alert(`New scanned data for party ${partyName} and SKU ${sku} added!`);
        }
    } catch (error) {
        console.error("❌ Error saving scanned data:", error);
    }
});

// ✅ Filter Scanned Data by Date Range from 'scannedQRData'
document.getElementById("filterData").addEventListener("click", async function() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!startDate || !endDate) {
        alert('Please select both start and end dates');
        return;
    }

    // Convert selected dates to JavaScript Date objects
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Remove the time part for startDate and endDate
    start.setHours(0, 0, 0, 0);  // Set startDate to 00:00:00
    end.setHours(23, 59, 59, 999);  // Set endDate to 23:59:59 for the whole day

    try {
        // Convert JavaScript Date to Firestore Timestamp for querying
        const startTimestamp = Timestamp.fromDate(start);
        const endTimestamp = Timestamp.fromDate(end);

        // Query the 'scannedQRData' collection for data within the selected date range
        const scannedQRDataRef = collection(db, 'scannedQRData');
        const q = query(
            scannedQRDataRef,
            where('timestamp', '>=', startTimestamp),
            where('timestamp', '<=', endTimestamp)
        );

        // Fetch the filtered data
        const querySnapshot = await getDocs(q);
        const scannedData = [];

        querySnapshot.forEach((doc) => {
            scannedData.push(doc.data());
        });

        // Display the filtered data in a table
        displayScannedData(scannedData);
    } catch (error) {
        console.error("❌ Error fetching filtered data:", error);
    }
});

// ✅ Display Scanned Data in Table
function displayScannedData(data) {
    const tableContainer = document.getElementById('tableContainer');

    // Ensure the tableContainer exists before proceeding
    if (!tableContainer) {
        console.error('❌ Table container not found.');
        return;  // Stop execution if the container doesn't exist
    }

    tableContainer.innerHTML = '';  // Clear any previous data

    if (data.length === 0) {
        tableContainer.innerHTML = 'No data found for the selected date range.';
        return;
    }

    // Create a table
    const table = document.createElement('table');
    table.border = "1";

    // Create header row
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `
        <th>Date</th>
        <th>Party Name</th>
        <th>SKU</th>
        <th>Required Quantity</th>
        <th>Scanned Quantity</th>
        <th>Thickness</th>
    `;
    table.appendChild(headerRow);

    // Add rows for each data item
    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.timestamp.toDate().toLocaleDateString()}</td>
            <td>${item.partyName}</td>
            <td>${item.sku}</td>
            <td>${item.requiredQuantity}</td>
            <td>${item.scannedQty}</td>
            <td>${item.thickness}</td>
        `;
        table.appendChild(row);
    });

    // Append the table to the tableContainer
    tableContainer.appendChild(table);
}
