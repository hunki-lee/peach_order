(function () {
  "use strict";

  var BANK_ACCOUNT = "농협 623083-56-013585 박민자";
  var SALES_NOTICE = "경봉(딱복)\n- 4kg 10-12과: 4.7만\n- 4kg 12과: 4.2만\n- 4kg 13-14과: 3.7만\n- 4kg 15-16과: 3.2만";

  var fields = {
    senderName: document.getElementById("senderName"),
    senderPhone: document.getElementById("senderPhone")
  };

  var productFieldLabels = {
    variety: "품종",
    boxSize: "규격/단가",
    boxCount: "박스 수"
  };

  var orderForm = document.getElementById("orderForm");
  var receiverList = document.getElementById("receiverList");
  var receiverTemplate = document.getElementById("receiverTemplate");
  var addReceiverButton = document.getElementById("addReceiverButton");
  var orderText = document.getElementById("orderText");
  var copyButton = document.getElementById("copyButton");
  var copyAccountButton = document.getElementById("copyAccountButton");
  var bankAccountText = document.getElementById("bankAccountText");
  var alertBox = document.getElementById("alertBox");
  var addressModal = document.getElementById("addressModal");
  var addressSearchContainer = document.getElementById("addressSearchContainer");
  var closeAddressSearch = document.getElementById("closeAddressSearch");
  var postcodeScriptPromise = null;
  var nextReceiverId = 1;
  var activeAddressCard = null;

  bankAccountText.textContent = BANK_ACCOUNT;

  function valueOf(fieldName) {
    return fields[fieldName].value.trim();
  }

  function valueOfInput(container, fieldName) {
    return getReceiverInput(container, fieldName).value.trim();
  }

  function getReceiverInput(container, fieldName) {
    return container.querySelector('[data-field="' + fieldName + '"]');
  }

  function getReceiverCards() {
    return Array.prototype.slice.call(receiverList.querySelectorAll(".receiver-card"));
  }

  function normalizeBoxCount(value) {
    var numberValue = Number(value);

    if (!Number.isFinite(numberValue) || numberValue < 1) {
      return "";
    }

    return String(Math.floor(numberValue));
  }

  function getSelectedVariety(card) {
    if (valueOfInput(card, "variety") === "직접입력") {
      return valueOfInput(card, "customVariety");
    }

    return valueOfInput(card, "variety");
  }

  function dispatchFieldChange(input) {
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function setReceiverInputValue(container, fieldName, value) {
    var input = getReceiverInput(container, fieldName);
    input.value = value || "";
    dispatchFieldChange(input);
  }

  function createReceiverCard() {
    var card = receiverTemplate.content.firstElementChild.cloneNode(true);
    var receiverId = String(nextReceiverId);
    nextReceiverId += 1;

    card.dataset.receiverId = receiverId;
    getReceiverInput(card, "salesNotice").textContent = SALES_NOTICE;
    receiverList.appendChild(card);
    updateCustomVarietyVisibility(card);
    renumberReceivers();
    refreshOrderText();
  }

  function renumberReceivers() {
    var cards = getReceiverCards();

    cards.forEach(function (card, index) {
      card.querySelector(".receiver-title").textContent = "받는 사람 " + (index + 1);
      card.querySelector('[data-action="remove-receiver"]').hidden = cards.length === 1;
    });
  }

  function removeReceiver(card) {
    if (getReceiverCards().length <= 1) {
      return;
    }

    card.remove();
    renumberReceivers();
    refreshOrderText();
  }

  function formatReceiverAddress(receiver) {
    var parts = [
      receiver.postcode ? "(" + receiver.postcode + ")" : "",
      receiver.baseAddress,
      receiver.detailAddress
    ];

    return parts.filter(Boolean).join(" ");
  }

  function getReceiverData(card) {
    return {
      id: card.dataset.receiverId,
      name: valueOfInput(card, "name"),
      phone: valueOfInput(card, "phone"),
      postcode: valueOfInput(card, "postcode"),
      baseAddress: valueOfInput(card, "baseAddress"),
      detailAddress: valueOfInput(card, "detailAddress"),
      variety: getSelectedVariety(card),
      boxSize: valueOfInput(card, "boxSize"),
      boxCount: normalizeBoxCount(valueOfInput(card, "boxCount"))
    };
  }

  function getOrderData() {
    return {
      senderName: valueOf("senderName"),
      senderPhone: valueOf("senderPhone"),
      receivers: getReceiverCards().map(getReceiverData)
    };
  }

  function buildQuantityLine(data) {
    var parts = [data.variety, data.boxSize, data.boxCount ? data.boxCount + "박스" : ""];
    return parts.filter(Boolean).join(" ");
  }

  function buildContactLine(name, phone, fallback) {
    var parts = [name, phone].filter(Boolean);

    return parts.length > 0 ? parts.join(" / ") : fallback;
  }

  function buildReceiverLines(receivers) {
    var hasManyReceivers = receivers.length > 1;
    var lines = [];

    receivers.forEach(function (receiver, index) {
      var receiverLabel = hasManyReceivers ? "받는사람" + (index + 1) : "받는사람";

      if (index > 0) {
        lines.push("");
      }

      lines.push(receiverLabel + ": " + buildContactLine(receiver.name, receiver.phone, ""));
      lines.push("주소: " + formatReceiverAddress(receiver));
      lines.push("상품: " + buildQuantityLine(receiver));
    });

    return lines;
  }

  function buildOrderText(data) {
    var lines = [
      "🍑 그린농원 복숭아 주문",
      "보내는사람: " + buildContactLine(data.senderName || "그린농원", data.senderPhone, "그린농원"),
      ""
    ];

    return lines.concat(buildReceiverLines(data.receivers)).join("\n");
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

    receiverList.querySelectorAll(".is-invalid").forEach(function (input) {
      input.classList.remove("is-invalid");
    });
  }

  function validateOrder() {
    var missing = [];

    clearInvalidState();

    getReceiverCards().forEach(function (card, index) {
      var receiverNumber = "받는 사람 " + (index + 1);
      var receiver = getReceiverData(card);

      if (!receiver.name) {
        missing.push(receiverNumber + " 이름");
        getReceiverInput(card, "name").classList.add("is-invalid");
      }

      if (!receiver.phone) {
        missing.push(receiverNumber + " 전화번호");
        getReceiverInput(card, "phone").classList.add("is-invalid");
      }

      if (!receiver.baseAddress) {
        missing.push(receiverNumber + " 주소");
        getReceiverInput(card, "baseAddress").classList.add("is-invalid");
      }

      Object.keys(productFieldLabels).forEach(function (fieldName) {
        var value = receiver[fieldName];

        if (!value) {
          missing.push(receiverNumber + " " + productFieldLabels[fieldName]);
          if (fieldName === "variety" && valueOfInput(card, "variety") === "직접입력") {
            getReceiverInput(card, "customVariety").classList.add("is-invalid");
          } else {
            getReceiverInput(card, fieldName).classList.add("is-invalid");
          }
        }
      });
    });

    if (missing.length > 0) {
      showAlert("확인해 주세요: " + missing.join(", "), "error");
      return false;
    }

    showAlert("", "success");
    return true;
  }

  function updateCustomVarietyVisibility(card) {
    var customVarietyField = card.querySelector('[data-field-wrap="customVariety"]');
    var customVarietyInput = getReceiverInput(card, "customVariety");
    var shouldShow = valueOfInput(card, "variety") === "직접입력";

    customVarietyField.hidden = !shouldShow;

    if (!shouldShow) {
      customVarietyInput.value = "";
      customVarietyInput.classList.remove("is-invalid");
    }
  }

  function hideAddressSearch() {
    addressModal.hidden = true;
    addressSearchContainer.innerHTML = "";
    activeAddressCard = null;
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

  function getSelectedAddress(addressData) {
    var address = addressData.roadAddress || addressData.jibunAddress || addressData.autoRoadAddress || addressData.autoJibunAddress || "";
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

    return address;
  }

  function handleAddressComplete(addressData) {
    var card = activeAddressCard;

    if (!card || !receiverList.contains(card)) {
      hideAddressSearch();
      return;
    }

    setReceiverInputValue(card, "postcode", addressData.zonecode || "");
    setReceiverInputValue(card, "baseAddress", getSelectedAddress(addressData));
    getReceiverInput(card, "baseAddress").classList.remove("is-invalid");
    refreshOrderText();
    getReceiverInput(card, "detailAddress").focus();
    showAlert("주소를 입력했습니다. 상세주소를 확인해 주세요.", "success");
    addressModal.hidden = true;
    addressSearchContainer.innerHTML = "";
    activeAddressCard = null;
  }

  function openAddressSearch(card) {
    activeAddressCard = card;
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

  function selectTextInElement(text, element) {
    if (!element) {
      return;
    }

    element.focus();
    element.select();
    element.setSelectionRange(0, text.length);
  }

  function fallbackCopyFromElement(text, element) {
    selectTextInElement(text, element);
    return document.execCommand("copy");
  }

  function fallbackCopyText(text) {
    var textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.width = "1px";
    textarea.style.height = "1px";
    textarea.style.padding = "0";
    textarea.style.border = "0";
    textarea.style.opacity = "0.01";
    textarea.style.fontSize = "16px";
    document.body.appendChild(textarea);

    var copied = false;

    try {
      copied = fallbackCopyFromElement(text, textarea);
    } finally {
      document.body.removeChild(textarea);
    }

    return copied;
  }

  function copyWithFallback(text, fallbackElement) {
    var copied = false;

    try {
      copied = fallbackCopyText(text);
    } catch (error) {
      copied = false;
    }

    if (!copied && fallbackElement) {
      selectTextInElement(text, fallbackElement);
    }

    return copied;
  }

  function timeoutClipboardWrite() {
    return new Promise(function (resolve) {
      window.setTimeout(function () {
        resolve(false);
      }, 700);
    });
  }

  function writeToClipboard(text, fallbackElement) {
    if (copyWithFallback(text, fallbackElement)) {
      return Promise.resolve(true);
    }

    if (navigator.clipboard && window.isSecureContext) {
      return Promise.race([
        navigator.clipboard.writeText(text).then(function () {
          return true;
        }).catch(function () {
          return false;
        }),
        timeoutClipboardWrite()
      ]).then(function (copied) {
        if (!copied && fallbackElement) {
          selectTextInElement(text, fallbackElement);
        }

        return copied;
      });
    }

    if (fallbackElement) {
      selectTextInElement(text, fallbackElement);
    }

    return Promise.resolve(false);
  }

  function copyOrderText() {
    refreshOrderText();
    clearInvalidState();

    writeToClipboard(orderText.value, orderText).then(function (copied) {
      if (copied) {
        showAlert("주문 문구를 복사했습니다. 카카오톡에 붙여넣어 주세요.", "success");
      } else {
        showAlert("자동 복사가 막혔습니다. 선택된 주문 문구를 직접 복사해 주세요.", "error");
      }
    }).catch(function () {
      selectTextInElement(orderText.value, orderText);
      showAlert("자동 복사가 막혔습니다. 선택된 주문 문구를 직접 복사해 주세요.", "error");
    });
  }

  function copyBankAccount() {
    writeToClipboard(BANK_ACCOUNT).then(function (copied) {
      if (copied) {
        showAlert("계좌번호를 복사했습니다.", "success");
      } else {
        showAlert("계좌 복사가 되지 않으면 계좌번호를 직접 선택해 주세요.", "error");
      }
    }).catch(function () {
      showAlert("계좌 복사가 되지 않으면 계좌번호를 직접 선택해 주세요.", "error");
    });
  }

  orderForm.addEventListener("input", refreshOrderText);
  orderForm.addEventListener("change", function (event) {
    var card = event.target.closest(".receiver-card");

    if (card) {
      updateCustomVarietyVisibility(card);
    }

    refreshOrderText();
  });
  receiverList.addEventListener("click", function (event) {
    var actionButton = event.target.closest("[data-action]");

    if (!actionButton) {
      return;
    }

    var card = event.target.closest(".receiver-card");

    if (actionButton.dataset.action === "search-address") {
      openAddressSearch(card);
    }

    if (actionButton.dataset.action === "remove-receiver") {
      removeReceiver(card);
    }
  });
  addReceiverButton.addEventListener("click", createReceiverCard);
  copyButton.addEventListener("click", copyOrderText);
  copyAccountButton.addEventListener("click", copyBankAccount);
  closeAddressSearch.addEventListener("click", hideAddressSearch);

  createReceiverCard();
}());
