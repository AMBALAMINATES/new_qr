
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyARwWaQh...",
  authDomain: "qrscanner-b2520.firebaseapp.com",
  projectId: "qrscanner-b2520",
  storageBucket: "qrscanner-b2520.appspot.com",
  messagingSenderId: "450779840958",
  appId: "1:450779840958:web:25dc854dc5ffec5781f9ef"
};


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


async function loadSKUSuggestions(queryText) {
  if (queryText.length < 3) {
    document.getElementById('skuSuggestions').innerHTML = ''; // Hide suggestions if input is too short
    return;
  }

  try {
    const skuSuggestionsContainer = document.getElementById('skuSuggestions');
    skuSuggestionsContainer.innerHTML = ''; // Clear previous suggestions

    // Query Firestore for SKUs that match the input SKU Code
    const skuRef = collection(db, 'SKU');  // Reference to the 'SKU' collection
    const q = query(skuRef, where('SKU Code', '>=', queryText), where('SKU Code', '<=', queryText + '\uf8ff'));
    const querySnapshot = await getDocs(q);

    let foundAny = false;

    querySnapshot.forEach((doc) => {
        const skuData = doc.data();
        
        console.log("🔥 Full SKU Data from Firestore:", skuData); // ✅ Debugging
        
        if (skuData['SKU Code'] && skuData['SKU Code'].includes(queryText)) {
          foundAny = true;
          const suggestionItem = document.createElement('div');
          suggestionItem.classList.add('suggestion-item');
          suggestionItem.textContent = `${skuData['SKU Code']} - ${skuData['Item Name']}`;
      
          
          suggestionItem.setAttribute('data-id', doc.id);
          suggestionItem.setAttribute('data-sku', skuData['SKU Code']);
          suggestionItem.setAttribute('data-item', skuData['Item Name'] || '');  
          suggestionItem.setAttribute('data-paper', skuData['Paper_code'] || '');  
          suggestionItem.setAttribute('data-category', skuData['CATEGORY'] || '');  // ✅ FIXED
          suggestionItem.setAttribute('data-finish', skuData['FINISH'] || '');  // ✅ FIXED
      
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


document.getElementById("sku").addEventListener("input", function(event) {
  const queryText = event.target.value;
  loadSKUSuggestions(queryText);
});


document.getElementById("skuSuggestions").addEventListener("click", function(event) {
    const clickedItem = event.target.closest(".suggestion-item");
    if (!clickedItem) return;
  
    console.log("✅ Selected SKU Data:", clickedItem.dataset); 
  
    const skuCode = clickedItem.dataset.sku;
    const itemName = clickedItem.dataset.item;
    const paperCode = clickedItem.dataset.paper;
    const thickness = clickedItem.dataset.category; 
    const finish = clickedItem.dataset.finish; 
  
    console.log("🔍 Thickness:", thickness, "Finish:", finish); 
  
    document.getElementById('sku').value = skuCode || '';
    document.getElementById('thickness').value = thickness || ''; 
    document.getElementById('size').value = extractSize(itemName) || '';
    document.getElementById('paperCode').value = paperCode || '';
    document.getElementById('finish').value = finish || ''; 
  
    document.getElementById("skuSuggestions").innerHTML = "";
  });
  

function extractSize(itemName) {
  if (!itemName) return '';
  const sizeMatch = itemName.match(/(\d+x\d+)/); // Match a pattern like 2440x1220
  return sizeMatch ? sizeMatch[0] : '';  
}



document.getElementById("generateQR").addEventListener("click", function () {
    const sku = document.getElementById("sku").value.trim();
    const thickness = document.getElementById("thickness").value.trim();
    const requiredQuantity = document.getElementById("requiredQuantity").value.trim();
    const quantity = document.getElementById("quantity").value.trim();

    if (!sku || !thickness || !requiredQuantity || !quantity) {
        alert("Please fill all fields before generating QR Code.");
        return;
    }

   
    const randomCode = Math.floor(100000 + Math.random() * 900000); // 6-digit random number
    const qrValue = `${sku}-${randomCode}`;

    
    document.getElementById("qrContainer").innerHTML = "";

   
    const qrContainer = document.createElement("div");
    qrContainer.classList.add("qr-box");

    const qrElement = document.createElement("div");
    new QRCode(qrElement, {
        text: qrValue,
        width: 150,
        height: 150
    });

    const qrLabel = document.createElement("p");
    qrLabel.textContent = `SKU: ${sku} | Thickness: ${thickness}`;

    qrContainer.appendChild(qrElement);
    qrContainer.appendChild(qrLabel);

    document.getElementById("qrContainer").appendChild(qrContainer);
});



document.getElementById("printQR").addEventListener("click", function() {
    const qrContainer = document.getElementById("qrContainer");
    if (!qrContainer.innerHTML.trim()) {
        alert("No QR Code to print. Please generate one first.");
        return;
    }

    const printWindow = window.open("", "", "width=400,height=400");
    printWindow.document.write("<html><head><title>Print QR Code</title></head><body>");
    printWindow.document.write(qrContainer.innerHTML);
    printWindow.document.write("</body></html>");
    printWindow.document.close();
    printWindow.print();
});


window.onload = function () {
  console.log("Page Loaded - SKU List & QR Code functionality is ready.");
};
