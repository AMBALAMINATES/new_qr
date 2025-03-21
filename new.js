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
    const partyName = document.getElementById("partyName").value.trim();

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
        const uniqueID = `${sku}-${randomCode}-${partyName}`;  // Append partyName to uniqueID

        const qrContainer = document.createElement("div");
        qrContainer.classList.add("qr-box");

        const qrTitle = document.createElement("p");
        qrTitle.textContent = "AMBA LAMINATES";
        qrTitle.style.fontWeight = "bold";

        const qrElement = document.createElement("div");
        new QRCode(qrElement, {
            text: uniqueID,  // Now includes the partyName
            width: 250,
            height: 100,
        });

        const qrLabel = document.createElement("p");
        qrLabel.textContent = `SKU: ${sku} | Thickness: ${thickness} | Party: ${partyName} | ID: ${uniqueID}`;

        qrContainer.appendChild(qrTitle);
        qrContainer.appendChild(qrElement);
        qrContainer.appendChild(qrLabel);

        document.getElementById("qrContainer").appendChild(qrContainer);

        // Add click event to the QR container to save data when clicked
        qrContainer.addEventListener('click', async function () {
            await saveQRCodeToFirebase(sku, thickness, requiredQuantity, partyName, uniqueID);
        });

        // Store QR codes in the array (for reference if needed)
        qrCodes.push({
            sku: sku,
            thickness: thickness,
            requiredQuantity: requiredQuantity,
            scannedQty: 0, // Initially, no items are scanned
            partyName: partyName,
            uniqueID: uniqueID,
            timestamp: new Date()  // Store the current timestamp for filtering
        });
    }

    // QR Codes are now generated, but not saved yet. Saving happens on click.

});

// ✅ Function to save QR code data to Firebase when it's clicked
async function saveQRCodeToFirebase(sku, thickness, requiredQuantity, partyName, uniqueID) {
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
                const updatedQty = existingData.scannedQty + 1; // Increment scanned quantity by 1 for each click

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
                scannedQty: 1,  // Start with 1 as the QR is clicked once
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
}

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

    // Remove the time portion
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    try {
        const scannedQRDataRef = collection(db, 'scannedQRData');
        const filteredQuery = query(
            scannedQRDataRef,
            where('timestamp', '>=', Timestamp.fromDate(start)),
            where('timestamp', '<=', Timestamp.fromDate(end))
        );

        const querySnapshot = await getDocs(filteredQuery);

        // Get the filteredResults container where we want to show the table
        const filteredResultsContainer = document.getElementById("filteredResults");

        if (filteredResultsContainer) {
            // Only clear the filtered results container (not the filter button)
            filteredResultsContainer.innerHTML = ''; 

            // Create a table element
            const table = document.createElement('table');
            table.border = "1";
            table.style.width = '100%'; // Optional, adjust width as needed

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

            // Add data rows for each document in the query snapshot
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${data.timestamp.toDate().toLocaleDateString()}</td>
                    <td>${data.partyName}</td>
                    <td>${data.sku}</td>
                    <td>${data.requiredQuantity}</td>
                    <td>${data.scannedQty}</td>
                    <td>${data.thickness}</td>
                `;
                table.appendChild(row);
            });

            // Append the table to the filteredResults container
            filteredResultsContainer.appendChild(table);
        } else {
            console.error("❌ Element 'filteredResults' not found in the DOM.");
        }
    } catch (error) {
        console.error("❌ Error filtering data:", error);
    }
});

document.getElementById("printQR").addEventListener("click", function () {
    const printWindow = window.open("", "_blank");
    printWindow.document.write("<html><head><title>Print QR Codes</title></head><body>");

    const qrCodes = document.getElementById("qrContainer").innerHTML;
    printWindow.document.write(qrCodes);

    printWindow.document.write("</body></html>");
    printWindow.document.close();

    setTimeout(function() {
        printWindow.print();
    }, 1000);
});
const sidebarItems = document.querySelectorAll('.sidebar-item');
const generateQRContent = document.getElementById('generateQRContent');
const dataContent = document.getElementById('dataContent');
const noSidebar = document.getElementById('noSidebar');
const sidebarOptions = document.getElementById('sidebarOptions');

sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
        // Remove active class from all sidebar items
        sidebarItems.forEach(i => i.classList.remove('active'));

        // Add active class to the clicked sidebar item
        item.classList.add('active');

        // Show content based on the clicked item
        if (item.id === 'generateQROption') {
            generateQRContent.style.display = 'block';
            dataContent.style.display = 'none';
            noSidebar.style.display = 'none';
            sidebarOptions.style.display = 'block';
        } else if (item.id === 'dataOption') {
            dataContent.style.display = 'block';
            generateQRContent.style.display = 'none';
            noSidebar.style.display = 'none';
            sidebarOptions.style.display = 'block';
        }
    });
});
