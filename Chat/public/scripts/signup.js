'use strict';

function SignUp() {
    this.submitForm = document.getElementById('submitForm');
    this.submitButton = document.getElementById('submitButton');
    this.usernameInput = document.getElementById('username-input');
    this.emailInput = document.getElementById('email-input');
    this.locationInput = document.getElementById('location-input');
    this.passwordInput = document.getElementById('password-input');
    this.signUpSnackbar = document.getElementById('signup-snackbar');

    this.submitForm.addEventListener('submit', this.submit.bind(this));


    this.initFirebase();
}

SignUp.prototype.initFirebase = function() {
    this.auth = firebase.auth();
    this.database = firebase.database();
    this.storage = firebase.storage();
    console.log('initFirebase');
    // this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));
};

SignUp.prototype.submit = function(e) {
    e.preventDefault();
    var enteredUserName = this.usernameInput.value;
    var enteredEmail = this.emailInput.value;
    var enteredLocation = this.locationInput.value;
    var enteredPassword = this.passwordInput.value;

    // This checks and prevents entered username from being duplicate
    // WARNING: Case-Sensitive
    this.database.ref('users/usernames/' + enteredUserName).once('value', function(snapshot){
        if(snapshot.exists()){
            console.log('Username exists already');
            // Alert the user that the username is invalid
            // Invalidate the rest of the submit function

            var data = {
                message: 'Username already exists',
                timeout: 2000
            };
            this.signUpSnackbar.MaterialSnackbar.showSnackbar(data);


            enteredUserName = null;
        }
    }.bind(this));



    if(enteredEmail && enteredPassword && enteredUserName){

        var setUserDetails_and_updateUidUsername = function(user){
            return this.database.ref('users/usernames/' + enteredUserName).set(
                {
                    photoURL: user.photoURL || "./images/profile_placeholder.png",
                    email: enteredEmail,
                    // Do not pass in password for security reasons
                    location: enteredLocation || "Unspecified"
                }
            ).then(function(){
                return this.database.ref('uids/' + user.uid).set({
                    username: enteredUserName
                });
            }.bind(this));
        }.bind(this);


        var redirectHome = function() {
            window.location = "./";
        };

        this.auth.createUserWithEmailAndPassword(enteredEmail, enteredPassword)
            .then(setUserDetails_and_updateUidUsername)
            .then(redirectHome)
            .catch(function(error) {
                var errorCode = error.code;
                var errorMessage = error.message;
                console.log(errorCode, errorMessage);
                alert('Sorry, this creation error occurred\n' + errorCode + "\n" + errorMessage + "\n" +
                        "Is this our fault?\n" +
                        'If you could kindly contact us with your web browser and any details, we will do our best to fix it. Thanks');
            });
    } else {
        var data = {
            message: 'Sorry! Email, Password, or Username is invalid.',
            timeout: 2000
        };
        this.signUpSnackbar.MaterialSnackbar.showSnackbar(data);
    }

};

window.onload = function() {
    window.SignUp = new SignUp();
};