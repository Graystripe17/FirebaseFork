'use strict'

function SignUp() {
    this.submitForm = document.getElementById('submitForm');
    this.submitButton = document.getElementById('submitButton');
    this.emailInput = document.getElementById('email-input');
    this.locationInput = document.getElementById('location-input');
    this.passwordInput = document.getElementById('password-input');

    this.submitForm.addEventListener('submit', this.submit.bind(this));


    this.initFirebase();
}

SignUp.prototype.initFirebase = function() {
    this.auth = firebase.auth();
    this.database = firebase.database();
    this.storage = firebase.storage();
    console.log('initFirebase');
    alert('init' + firebase.database());
    // this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));
};

SignUp.prototype.submit = function(e) {
    e.preventDefault();
    var enteredEmail = this.emailInput.value;
    var enteredLocation = this.locationInput.value;
    var enteredPassword = this.passwordInput.value;

    // Required, will redirect
    // TODO: Simplify this nested promise
    if(enteredEmail && enteredPassword){
        this.auth.createUserWithEmailAndPassword(enteredEmail, enteredPassword)
            .then(function(user){
                this.database.ref('users/' + user.uid).set(
                    {
                        username: user.displayName || "Unnamed User",
                        photoURL: user.photoURL || "./images/profile_placeholder.jpg",
                        email: enteredEmail,
                        // Do not pass in password for security reasons
                        location: enteredLocation,
                    }
                ).then(function(snapshot) {
                    window.location = "./";
                }.bind(this)).catch(function(err){
                    console.error('Error creating user ', err);
                    alert('Sorry, this server error occurred:\n' + err);
                })
            }.bind(this))
            .catch(function(error) {
                var errorCode = error.code;
                var errorMessage = error.message;
                console.log(errorCode, errorMessage);
                alert('Sorry, this creation error occurred\n' + errorCode + "\n" + errorMessage + "\n" +
                        "If you could kindly contact us with your web browser and any details, we will do our best to fix it. Thanks");
            });
    }

};

window.onload = function() {
    window.SignUp = new SignUp();
};