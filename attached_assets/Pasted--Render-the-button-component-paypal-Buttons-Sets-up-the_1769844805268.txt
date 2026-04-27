
// Render the button component
paypal
.Buttons({
// Sets up the transaction when a payment button is clicked
createOrder: function (data) {
return fetch("myserver.com/api/orders", {
 method: "POST",
 // Use the "body" parameter to optionally pass additional order information
 // such as product ID or amount
 body: {
   paymentSource: data.paymentSource,
 },
})
 .then((response) => response.json())
 .then((order) => order.id);
},
// Finalize the transaction after payer approval
onApprove: function (data) {
return fetch(`myserver.com/api/orders/${data.orderID}/capture`, {
 method: "POST",
})
 .then((response) => response.json())
 .then((orderData) => {
   // Successful capture! For dev/demo purposes:
   console.log(
     "Capture result",
     orderData,
     JSON.stringify(orderData, null, 2),
   );
   var transaction = orderData.purchase_units[0].payments.captures[0];
   // Show a success message within this page. For example:
   // var element = document.getElementById('paypal-button-container');
   // element.innerHTML = '<h3>Thank you for your payment!</h3>';
   // Or go to another URL: actions.redirect('thank_you.html');
 });
},
onError: function (error) {
// Do something with the error from the SDK
},
})
.render("#paypal-button-container");

// Create the Card Fields Component and define callbacks
const cardField = paypal.CardFields({
createOrder: function (data) {
return fetch("myserver.com/api/orders", {
method: "POST",
body: {
 paymentSource: data.paymentSource,
},
})
.then((res) => {
 return res.json();
})
.then((orderData) => {
 return orderData.id;
});
},
onApprove: function (data) {
const { orderID } = data;
return fetch(`myserver.com/api/orders/${orderID}/capture`, {
method: "POST",
})
.then((res) => {
 return res.json();
})
.then((orderData) => {
 // Redirect to success page
});
},
onError: function (error) {
// Do something with the error from the SDK
},
});
// Render each field after checking for eligibility
if (cardField.isEligible()) {
const nameField = cardField.NameField();
nameField.render("#card-name-field-container");

const numberField = cardField.NumberField();
numberField.render("#card-number-field-container");

const cvvField = cardField.CVVField();
cvvField.render("#card-cvv-field-container");

const expiryField = cardField.ExpiryField();
expiryField.render("#card-expiry-field-container");

// Add click listener to submit button and call the submit function on the CardField component
document
.getElementById("card-field-submit-button")
.addEventListener("click", () => {
cardField.submit({
 // From your billing address fields
 billingAddress: {
   addressLine1: document.getElementById(
     "card-billing-address-line-1",
   ).value,
   addressLine2: document.getElementById(
     "card-billing-address-line-2",
   ).value,
   adminArea1: document.getElementById(
     "card-billing-address-admin-area-line-1",
   ).value,
   adminArea2: document.getElementById(
     "card-billing-address-admin-area-line-2",
   ).value,
   countryCode: document.getElementById(
     "card-billing-address-country-code",
   ).value,
   postalCode: document.getElementById(
     "card-billing-address-postal-code",
   ).value,
 }
}).then(() => {
 // submit successful
});
});
}
