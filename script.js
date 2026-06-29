(function () {
  "use strict";

  var DEFAULT_ACCOUNT = "농협 623083-56-013585 박민자";

  var fields = {
    senderName: document.getElementById("senderName"),
    senderPhone: document.getElementById("senderPhone"),
    receiverName: document.getElementById("receiverName"),
    receiverPhone: document.getElementById("receiverPhone"),
    receiverPostcode: document.getElementById("receiverPostcode"),
    receiverBaseAddress: document.getElementById("receiverBaseAddress"),
    receiverDetailAddress: document.getElementById("receiverDetailAddress"),
    variety: document.getElementById("variety"),
    boxSize: document.getElementById("boxSize"),
    boxCount: document.getElementById("boxCount"),
    payerName: document.getElementById("payerName"),
    amount: document.getElementById("amount"),
    bankAccount: document.getElementById("bankAccount"),
    memo: document.getElementById("memo")
  };

  var requiredFieldLabels = {
    receiverName: "받는 사람 이름",
    receiverPhone: "받는 사람 전화번호",
    receiverBaseAddress: "받는 사람 주소",
    variety: "품종",
    boxSize: "규격",
    boxCount: "박스 수",
    payerName: "입금자명",
    bankAccount: "입금계좌"
  };

  var orderForm = document.getElementById("orderForm");
  var orderText = document.getElementById("orderText");
  var copyButton = document.getElementById("copyButton");
  var alertBox = document.getElementById("alertBox");
  var addressSearchButton = document.getElementById("addressSearchButton");
  var addressModal = document.getElementById("addressModal");
  var addressSearchContainer = document.getElementById("addressSearchContainer");
  var closeAddressSearch = document.getElementById("closeAddressSearch");
  var postcodeScriptPromise = null;

  function valueOf(fieldName) {
    return fields[fieldName].value.trim();
  }

  function normalizeBoxCount(value) {
    var numberValue = Number(value);

    if (!Number.isFinite(numberValue) || numberValue < 1) {
      return "";
    }

    return String(Math.floor(numberValue));
  }

  function formatReceiverAddress(data) {
    var parts = [
      data.receiverPostcode ? "(" + data.receiverPostcode + ")" : "",
      data.receiverBaseAddress,
      data.receiverDetailAddress
    ];

    return parts.filter(Boolean).join(" ");
  }

  function getOrderData() {
    var boxCount = normalizeBoxCount(valueOf("boxCount"));

    return {
      senderName: valueOf("senderName"),
      senderPhone: valueOf("senderPhone"),
      receiverName: valueOf("receiverName"),
      receiverPhone: valueOf("receiverPhone"),
      receiverPostcode: valueOf("receiverPostcode"),
      receiverBaseAddress: valueOf("receiverBaseAddress"),
      receiverDetailAddress: valueOf("receiverDetailAddress"),
      variety: valueOf("variety"),
      boxSize: valueOf("boxSize"),
      boxCount: boxCount,
      payerName: valueOf("payerName"),
      amount: valueOf("amount"),
      bankAccount: valueOf("bankAccount") || DEFAULT_ACCOUNT,
      memo: valueOf("memo")
    };
  }

  function buildQuantityLine(data) {
    var parts = [data.variety, data.boxSize, data.boxCount ? data.boxCount + "박스" : ""];
    return parts.filter(Boolean).join(" ");
  }

  function buildOrderText(data) {
    return [
      "🍑 복숭아 주문서",
      "",
      "1. 보내는사람",
      "이름: " + data.senderName,
      "전화번호: " + data.senderPhone,
      "※ 미입력 시 농장주 이름으로 배송",
      "",
      "2. 받는사람",
      "이름: " + data.receiverName,
      "전화번호: " + data.receiverPhone,
      "주소: " + formatReceiverAddress(data),
      "",
      "3. 수량",
      buildQuantityLine(data),
      "",
      "4. 입금정보",
      "입금자명: " + data.payerName,
      "금액: " + data.amount,
      "",
      "입금계좌",
      data.bankAccount,
      "",
      "메모: " + data.memo
    ].join("\n");
  }

  function showAlert(message, type) {
    alertBox.textContent = message;
    alertBox.hidden = !message;
    alertBox.classList.toggle("success", type === "success");
  }

  function clearInvalidState() {
    Object.keys(fields).forEach(function (fieldName) {
      fields[fieldName].classList.remove("is-invalid");
    });
  }

  function validateOrder() {
    var missing = [];
    var data = getOrderData();

    clearInvalidState();

    Object.keys(requiredFieldLabels).forEach(function (fieldName) {
      var value = fieldName === "boxCount" ? data.boxCount : data[fieldName];

      if (!value) {
        missing.push(requiredFieldLabels[fieldName]);
        fields[fieldName].classList.add("is-invalid");
      }
    });

    if (missing.length > 0) {
      showAlert("확인해 주세요: " + missing.join(", "), "error");
      return false;
    }

    showAlert("", "success");
    return true;
  }

  function hideAddressSearch() {
    addressModal.hidden = true;
    addressSearchContainer.innerHTML = "";
  }

  function loadPostcodeScript() {
    if (window.daum && window.daum.Postcode) {
      return Promise.resolve();
    }

    if (postcodeScriptPromise) {
      return postcodeScriptPromise;
    }

    postcodeScriptPromise = new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });

    return postcodeScriptPromise;
  }

  function handleAddressComplete(addressData) {
    var address = addressData.roadAddress || addressData.jibunAddress || "";
    var extraAddress = [];

    if (addressData.bname && /(동|로|가)$/.test(addressData.bname)) {
      extraAddress.push(addressData.bname);
    }

    if (addressData.buildingName && addressData.apartment === "Y") {
      extraAddress.push(addressData.buildingName);
    }

    if (extraAddress.length > 0) {
      address += " (" + extraAddress.join(", ") + ")";
    }

    fields.receiverPostcode.value = addressData.zonecode || "";
    fields.receiverBaseAddress.value = address;
    fields.receiverBaseAddress.classList.remove("is-invalid");
    hideAddressSearch();
    fields.receiverDetailAddress.focus();
    refreshOrderText();
  }

  function openAddressSearch() {
    showAlert("주소 검색창을 여는 중입니다.", "success");

    loadPostcodeScript()
      .then(function () {
        addressModal.hidden = false;
        addressSearchContainer.innerHTML = "";

        new window.daum.Postcode({
          oncomplete: handleAddressComplete,
          width: "100%",
          height: "100%"
        }).embed(addressSearchContainer);

        showAlert("", "success");
      })
      .catch(function () {
        showAlert("주소 검색을 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 다시 눌러 주세요.", "error");
      });
  }

  function refreshOrderText() {
    var data = getOrderData();
    orderText.value = buildOrderText(data);
  }

  function fallbackCopy(text) {
    orderText.focus();
    orderText.select();
    orderText.setSelectionRange(0, text.length);
    return document.execCommand("copy");
  }

  function copyOrderText() {
    refreshOrderText();

    if (!validateOrder()) {
      return;
    }

    var text = orderText.value;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(function () {
          showAlert("주문 문구를 복사했습니다. 카카오톡에 붙여넣어 주세요.", "success");
        })
        .catch(function () {
          if (fallbackCopy(text)) {
            showAlert("주문 문구를 복사했습니다. 카카오톡에 붙여넣어 주세요.", "success");
          } else {
            showAlert("복사가 되지 않으면 주문 문구를 길게 눌러 직접 선택해 주세요.", "error");
          }
        });
      return;
    }

    if (fallbackCopy(text)) {
      showAlert("주문 문구를 복사했습니다. 카카오톡에 붙여넣어 주세요.", "success");
    } else {
      showAlert("복사가 되지 않으면 주문 문구를 길게 눌러 직접 선택해 주세요.", "error");
    }
  }

  orderForm.addEventListener("input", refreshOrderText);
  orderForm.addEventListener("change", refreshOrderText);
  copyButton.addEventListener("click", copyOrderText);
  addressSearchButton.addEventListener("click", openAddressSearch);
  closeAddressSearch.addEventListener("click", hideAddressSearch);

  refreshOrderText();
}());
