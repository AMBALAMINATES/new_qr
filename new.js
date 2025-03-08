// ✅ Import Firebase Modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
    getFirestore, collection, doc, setDoc, getDoc, getDocs 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ✅ Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyARwWaQhJFOn7Ydh37AegJPyqMP-iVaj2s",
    authDomain: "qrscanner-b2520.firebaseapp.com",
    projectId: "qrscanner-b2520",
    storageBucket: "qrscanner-b2520.appspot.com",
    messagingSenderId: "450779840958",
    appId: "1:450779840958:web:25dc854dc5ffec5781f9ef",
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
let scannedIds = new Set();

// ✅ Generate QR Codes
function generateQRCode() {
    const partyName = document.getElementById('partyName').value.trim();
    const sku = document.getElementById('sku').value.trim();
    const thickness = document.getElementById('thickness').value.trim();
    const requiredQuantity = parseInt(document.getElementById('requiredQuantity').value, 10);
    const quantity = parseInt(document.getElementById('quantity').value, 10);

    if (!partyName || !sku || !thickness || isNaN(requiredQuantity) || isNaN(quantity) || requiredQuantity <= 0 || quantity <= 0) {
        alert("Please fill in all fields with valid data.");
        return;
    }

    const qrContainer = document.getElementById('qrContainer');
    qrContainer.innerHTML = '';

    for (let i = 0; i < quantity; i++) {
        const uniqueId = `${sku}-${partyName}-${Math.floor(1000000 + Math.random() * 9000000)}`;
        const qrData = { 
            partyName, 
            sku, 
            uniqueId, 
            requiredQuantity, 
            scannedQuantity: 0, 
            thickness, 
            date: new Date().toISOString().split('T')[0] 
        };

        const qrCodeDiv = document.createElement('div');
        qrCodeDiv.classList.add('qr-box');

        new QRCode(qrCodeDiv, { text: JSON.stringify(qrData), width: 180, height: 180 });

        const detailsText = document.createElement('div');
        detailsText.innerHTML = `<b>SKU:</b> ${sku}<br><b>Party:</b> ${partyName}<br><b>ID:</b> ${uniqueId}`;
        detailsText.style.textAlign = "center";
        qrCodeDiv.appendChild(detailsText);

        qrCodeDiv.addEventListener('click', function () {
            scanQRCode(qrData);
        });

        qrContainer.appendChild(qrCodeDiv);
    }
}

// ✅ Scan QR Code and Save to Firebase (Ensure Separate Entries for SKU & Party Name)
async function scanQRCode(qrData) {
    if (scannedIds.has(qrData.uniqueId)) {
        alert("This QR code has already been scanned.");
        return;
    }

    scannedIds.add(qrData.uniqueId);

    try {
        const docId = `${qrData.sku}-${qrData.partyName}`; // ✅ Unique ID: SKU + Party Name
        const docRef = doc(db, "scannedQRData", docId);
        const docSnap = await getDoc(docRef);

        let scannedQuantity = 1;
        let requiredQuantity = qrData.requiredQuantity;

        // ✅ Check if the SKU & Party combination exists in Firestore
        if (docSnap.exists()) {
            const existingData = docSnap.data();
            scannedQuantity = existingData.scannedQuantity + 1; // ✅ Increment only for the same party
            requiredQuantity = existingData.requiredQuantity;
        }

        // ✅ Save/Update Firestore Entry
        await setDoc(docRef, {
            partyName: qrData.partyName,
            sku: qrData.sku,
            uniqueId: qrData.uniqueId,
            requiredQuantity: requiredQuantity,
            scannedQuantity: scannedQuantity,
            thickness: qrData.thickness,
            date: qrData.date
        });

        console.log("✅ Scanned QR Code saved to Firebase!", qrData);
        updateScannedTable();
    } catch (error) {
        console.error("❌ Error saving scanned QR:", error);
    }
}

// ✅ Fetch Data from Firebase
async function fetchQRData() {
    try {
        const querySnapshot = await getDocs(collection(db, "scannedQRData"));
        querySnapshot.forEach((doc) => {
            console.log(doc.id, " => ", doc.data());
        });
    } catch (error) {
        console.error("❌ Error fetching data:", error);
    }
}
fetchQRData();

// ✅ Load Data into Table
async function updateScannedTable() {
    const tableBody = document.querySelector("#qrDataTable tbody");
    tableBody.innerHTML = "";

    const querySnapshot = await getDocs(collection(db, "scannedQRData"));
    
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${data.date}</td>
            <td>${data.sku}</td>
            <td>${data.partyName}</td>
            <td>${data.requiredQuantity}</td>
            <td>${data.scannedQuantity}</td>
        `;
    });
}

// ✅ Date Filter Functionality
document.getElementById("filterButton").addEventListener("click", async () => {
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;
    const tableBody = document.querySelector("#qrDataTable tbody");
    tableBody.innerHTML = "";

    const querySnapshot = await getDocs(collection(db, "scannedQRData"));

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.date >= startDate && data.date <= endDate) {
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td>${data.date}</td>
                <td>${data.sku}</td>
                <td>${data.partyName}</td>
                <td>${data.requiredQuantity}</td>
                <td>${data.scannedQuantity}</td>
            `;
        }
    });
});

// ✅ Print QR Codes
function printQRCode() {
    const qrContainer = document.getElementById('qrContainer');
    if (!qrContainer) {
        console.error("❌ QR Container not found!");
        return;
    }

    const qrHTML = qrContainer.innerHTML;
    const printWindow = window.open("", "_blank");

    printWindow.document.write(`
        <html>
        <head>
            <title>Print QR Codes</title>
            <style>
                body { text-align: center; }
                .qr-box { display: inline-block; margin: 10px; }
            </style>
        </head>
        <body>
            ${qrHTML}
            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("printQRButton")?.addEventListener("click", printQRCode);
});

window.generateQRCode = generateQRCode;
window.scanQRCode = scanQRCode;
window.updateScannedTable = updateScannedTable;
window.printQRCode = printQRCode;
