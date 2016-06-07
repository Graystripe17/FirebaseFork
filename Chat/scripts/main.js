/**
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

// Initializes FriendlyChat.
function FriendlyChat() {
  this.checkSetup();

  // Shortcuts to DOM Elements.
  this.messageList = document.getElementById('messages');
  this.messageForm = document.getElementById('message-form');
  this.messageInput = document.getElementById('message');
  this.submitButton = document.getElementById('submit');
  this.submitImageButton = document.getElementById('submitImage');
  this.imageForm = document.getElementById('image-form');
  this.mediaCapture = document.getElementById('mediaCapture');
  this.userPic = document.getElementById('user-pic');
  this.userName = document.getElementById('user-name');
  this.signInGoogleButton = document.getElementById('sign-in-google');
  this.signOutButton = document.getElementById('sign-out');
  this.signInSnackbar = document.getElementById('must-signin-snackbar');

  this.anonToggle = document.getElementById('switch-1');
  this.publicToggle = document.getElementById('switch-2');
  this.signInEmailButton = document.getElementById('sign-in-email');
  this.emailInputField = document.getElementById('email-input');
  this.passwordInputField = document.getElementById('password-input');
  this.findForm = document.getElementById('find-form');
  this.findButton = document.getElementById('user-search');
  this.findInput = document.getElementById('query');
  this.signUpButton = document.getElementById('sign-up-email');
  this.resultCard = document.getElementById('results-card');
  this.displayNameText = document.getElementById('display-name-text');
  this.locationText = document.getElementById('location-text');
  this.anonChatButton = document.getElementById('anon-chat-button');
  this.viewProfileButton = document.getElementById('view-profile-button');



  // Saves message on form submit.
  this.messageForm.addEventListener('submit', this.saveMessage.bind(this));
  this.signOutButton.addEventListener('click', this.signOut.bind(this));
  this.signInGoogleButton.addEventListener('click', this.signIn.bind(this));
  this.signInEmailButton.addEventListener('click', this.signInEmail.bind(this));
  this.signUpButton.addEventListener('click', this.signUpEmail.bind(this));

  this.anonToggle.addEventListener('change', this.toggleAnon.bind(this));
  this.publicToggle.addEventListener('change', this.togglePublic.bind(this));
  this.findForm.addEventListener('submit', this.queryUsers.bind(this));

  // Toggle for the button.
  // Can apply to any field
  var buttonMessageTogglingHandler = this.toggleButtonMessage.bind(this);
  this.messageInput.addEventListener('keyup', buttonMessageTogglingHandler);
  this.messageInput.addEventListener('change', buttonMessageTogglingHandler);
  var buttonFindTogglingHandler = this.toggleButtonFind.bind(this);
  this.findInput.addEventListener('keyup', buttonFindTogglingHandler);
  this.findInput.addEventListener('change', buttonFindTogglingHandler);


  // Events for image upload.
  this.submitImageButton.addEventListener('click', function() {
    this.mediaCapture.click();
  }.bind(this));
  this.mediaCapture.addEventListener('change', this.saveImageMessage.bind(this));


  this.initFirebase();

  this.loadMessages();

  // Refresh
  this.onAuthStateChanged();
}

// Sets up shortcuts to Firebase features and initiate firebase auth.
FriendlyChat.prototype.initFirebase = function() {
  console.log("initFirebase");
  this.auth = firebase.auth();
  this.database = firebase.database();
  this.storage = firebase.storage();
  this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));
};

// Loads chat messages history and listens for upcoming ones.
FriendlyChat.prototype.loadMessages = function(chatID) {

  // Reference to the /messages/ database path.
  this.messagesRef = this.database.ref('messages/' + chatID);
  // Make sure we remove all previous listeners.
  this.messagesRef.off();
  // Loads the last 12 messages and listen for new ones.
  // data represents a messageID
  var setMessage = function(data) {
    var val = data.val();
    this.displayMessage(data.key, val.name, val.text, val.photoUrl, val.imageUrl);
  }.bind(this);
  this.messagesRef.limitToLast(12).on('child_added', setMessage);
  this.messagesRef.limitToLast(12).on('child_changed', setMessage);
};

// Saves a new message on the Firebase DB.
FriendlyChat.prototype.saveMessage = function(e) {
  console.log("saveMessage");
  e.preventDefault();
  // Check that the user entered a message and is signed in.
  if (this.messageInput.value && this.checkSignedInWithMessage()) {

    var currentUser = this.auth.currentUser;
    // Updates Firebase database
    this.messagesRef.push(
        {
          name: currentUser.displayName || 'User' + currentUser.uid,
          text: this.messageInput.value,
          photoUrl: currentUser.photoURL || '/images/profile_placeholder.png'
        }
    ).then(function() {
      // Clear the text
      FriendlyChat.resetMaterialTextfield(this.messageInput);
      this.toggleButtonMessage();
    }.bind(this)).catch(function(err){
      console.error('Error writing new message', err);
    })

  }
};

// Sets the URL of the given img element with the URL of the image stored in Firebase Storage.
FriendlyChat.prototype.setImageUrl = function(imageUri, imgElement) {

  if(imageUri.startsWith('gs://')) {
    imgElement.src = FriendlyChat.LOADING_IMAGE_URL;
    this.storage.refFromURL(imageUri).getMetadata().then(function(metadata){
      imgElement.src = metadata.downloadURLs[0];
    });
  } else {
    imgElement.src = imageUri;
  }

};

// Saves a new message containing an image URI in Firebase.
// This first saves the image in Firebase storage.
FriendlyChat.prototype.saveImageMessage = function(event) {
  var file = event.target.files[0];

  // Clear the selection in the file picker input.
  this.imageForm.reset();

  // Check if the file is an image.
  if (!file.type.match('image.*')) {
    var data = {
      message: 'Sorry! You can only share images',
      timeout: 2000
    };
    this.signInSnackbar.MaterialSnackbar.showSnackbar(data);
    return;
  }
  // Check if the user is signed-in
  if (this.checkSignedInWithMessage()) {

    var currentUser = this.auth.currentUser;
    this.messagesRef.push({
      name: currentUser.displayName,
      imageUrl: FriendlyChat.LOADING_IMAGE_URL,
      photoUrl: currentUser.photoURL || '/images/profile_placeholder.png'
    }).then(function(data){

      // Upload image to Firebase Storage
      var uploadTask = this.storage.ref(currentUser.uid + '/' + Date.now() +'/' + file.name)
          .put(file, {'contentType': file.type});
      // Check for upload completion
      uploadTask.on('state_changed', null, function(error){
        console.error('There was an error uploading a file to Firebase Storage:', error);
      }, function() {
        // Update the placeholder
        var filePath = uploadTask.snapshot.metadata.fullPath;
        data.update({imageUrl: this.storage.ref(filePath).toString()});

      }.bind(this));

    }.bind(this));

  }
};

// Signs-in Friendly Chat.
FriendlyChat.prototype.signIn = function(googleUser) {
  var provider = new firebase.auth.GoogleAuthProvider();
  this.auth.signInWithPopup(provider).then(function(result) {
    // Google Access token
    var token = result.credential.accessToken;
    var user = result.user;
    console.log(user);
    var displayName = user.displayName || 'User' + user.uid;
    this.googleRef = this.database.ref('users/usernames/'+displayName);
    this.googleRef.set(
        {
          photoURL: user.photoURL,
          email: user.email,
          location: "Unspecified"
        }
    ).then(function(snapshot){
      console.log('Success');
    }.bind(this)).catch(function(err){
      console.log('Sorry, this server error occurred\n' + err);
      console.log('If a permission denied error occurred, this is because Firebase ' +
                  'is not allowed to write into an existing JSON path. For OAuth with ' +
                  'Google, this is normal. This error occurs when not using OAuth for ' +
                  'first time.');
    })
  }.bind(this));
};

// Signs-out of Friendly Chat.
FriendlyChat.prototype.signOut = function() {
  this.auth.signOut();
};

// Triggers when the auth state change for instance when the user signs-in or signs-out.
FriendlyChat.prototype.onAuthStateChanged = function(user) {
  if (user) { // User is signed in!
    // Get profile pic and user's name from the Firebase user object.
    var profilePicUrl = user.photoURL;
    var userName = user.displayName || "User" + user.uid;

    // Set the user's profile pic and name.
    this.userPic.style.backgroundImage = 'url(' + profilePicUrl + ')';
    this.userName.textContent = userName;

    // Show user's profile and sign-out button.
    this.userName.removeAttribute('hidden');
    this.userPic.removeAttribute('hidden');
    this.signOutButton.removeAttribute('hidden');

    // Hide sign-in button.
    this.signInGoogleButton.setAttribute('hidden', 'true');
    this.signInEmailButton.setAttribute('hidden', 'true');
    this.signUpButton.setAttribute('hidden', 'true');

  } else { // User is signed out!
    // Hide user's profile and sign-out button.
    this.userName.setAttribute('hidden', 'true');
    this.userPic.setAttribute('hidden', 'true');
    this.signOutButton.setAttribute('hidden', 'true');

    // Show sign-in buttons.
    this.signInGoogleButton.removeAttribute('hidden');
    this.signInEmailButton.removeAttribute('hidden');
    this.signUpButton.removeAttribute('hidden');

  }
};

// Returns true if user is signed-in. Otherwise false and displays a message.
FriendlyChat.prototype.checkSignedInWithMessage = function() {
  if(this.auth.currentUser){
    return true;
  }
  // Display a message to the user using a Toast.
  var data = {
    message: 'You must sign-in first',
    timeout: 2000
  };
  this.signInSnackbar.MaterialSnackbar.showSnackbar(data);
  return false;
};

// Resets the given MaterialTextField.
FriendlyChat.resetMaterialTextfield = function(element) {
  element.value = '';
  element.parentNode.MaterialTextfield.boundUpdateClassesHandler();
};

// Template for messages.
FriendlyChat.MESSAGE_TEMPLATE =
    '<div class="message-container">' +
      '<div class="spacing"><div class="pic"></div></div>' +
      '<div class="message"></div>' +
      '<div class="name"></div>' +
    '</div>';
// Template for find results
FriendlyChat.FIND_TEMPLATE =
    '<div class="result-container">' +
        '<div class="spacing"><div class="pic"</div></div>' +
        '<div class="result"></div>' +
        '<div class="name"></div>' +
    '</div>' +
    '<a class="mdl-list__item-secondary-action" href="#">' +
        '<i class="material-icons">star</i>' +
    '</a>';

// A loading image URL.
FriendlyChat.LOADING_IMAGE_URL = 'https://www.google.com/images/spin-32.gif';

// Displays a Message in the UI.
FriendlyChat.prototype.displayMessage = function(key, name, text, picUrl, imageUri) {
  var div = document.getElementById(key);
  // If an element for that message does not exists yet we create it.
  if (!div) {
    var container = document.createElement('div');
    container.innerHTML = FriendlyChat.MESSAGE_TEMPLATE;
    div = container.firstChild;
    div.setAttribute('id', key);
    this.messageList.appendChild(div);
  }
  if (picUrl) {
    div.querySelector('.pic').style.backgroundImage = 'url(' + picUrl + ')';
  }
  div.querySelector('.name').textContent = name;
  var messageElement = div.querySelector('.message');
  if (text) { // If the message is text.
    messageElement.textContent = text;
    // Replace all line breaks by <br>.
    messageElement.innerHTML = messageElement.innerHTML.replace(/\n/g, '<br>');
  } else if (imageUri) { // If the message is an image.
    var image = document.createElement('img');
    image.addEventListener('load', function() {
      this.messageList.scrollTop = this.messageList.scrollHeight;
    }.bind(this));
    this.setImageUrl(imageUri, image);
    messageElement.innerHTML = '';
    messageElement.appendChild(image);
  }
  // Show the card fading-in.
  setTimeout(function() {div.classList.add('visible')}, 0.5);
  this.messageList.scrollTop = this.messageList.scrollHeight;
  this.messageInput.focus();
};


// Enables or disables the submit button depending on the values of the input
// fields.
FriendlyChat.prototype.toggleButtonMessage = function() {
  if (this.messageInput.value) {
    this.submitButton.removeAttribute('disabled');
  } else {
    this.submitButton.setAttribute('disabled', 'true');
  }
};

FriendlyChat.prototype.toggleButtonFind = function(){
  if(this.findInput.value){
    this.findButton.removeAttribute('disabled');
  } else {
    this.findButton.setAttribute('disabled', 'true');
  }
};

// Checks that the Firebase SDK has been correctly setup and configured.
FriendlyChat.prototype.checkSetup = function() {
  if (!window.firebase || !(firebase.app instanceof Function) || !window.config) {
    window.alert('You have not configured and imported the Firebase SDK. ' +
        'Make sure you go through the codelab setup instructions.');
  } else if (config.storageBucket === '') {
    window.alert('Your Firebase Storage bucket has not been enabled. Sorry about that. This is ' +
        'actually a Firebase bug that occurs rarely.' +
        'Please go and re-generate the Firebase initialisation snippet (step 4 of the codelab) ' +
        'and make sure the storageBucket attribute is not empty.');
  }
};

FriendlyChat.prototype.toggleAnon = function() {
  console.log("toggleAnon");
  if(this.anonToggle.checked){
    console.log("checked");
  } else {
    console.log("unchecked");
  }
};

FriendlyChat.prototype.togglePublic = function() {
  console.log("togglePublic");
};

FriendlyChat.prototype.signInEmail = function() {
  console.log("Sign in with Email");
  var email = this.emailInputField.value;
  var password = this.passwordInputField.value;
  console.log(email);
  this.auth.signInWithEmailAndPassword(email, password).catch(function(error) {
    var errorCode = error.code;
    var errorMessage = error.message;
    console.log(errorCode, errorMessage);
  });
};

FriendlyChat.prototype.signUpEmail = function() {
  window.location = "./signup.html";
};




FriendlyChat.prototype.queryUsers = function(e) {
    console.log("queryUsers");
    e.preventDefault();
  var queryText = this.findInput.value;
  if (queryText) {
    var currentUser = this.auth.currentUser;
    // Query Firebase database
    this.resultsRef = this.database.ref('users/usernames/'+queryText);
    this.resultsRef.once('value').then(function(snapshot) {
      if(snapshot.val() === null){
        console.log("No one found");
        // Call noResults method and display emailing options
        this.noResults();
      } else {
        // snapshot must currently be unique
        // Note that to scale the search to multiuser, you must implement an array
        var found_user = snapshot.val();
        console.log(found_user);
        // Populate view card
        // Hackish solution: populate display with query text instead of root JSON
        var selected_user_display_name = queryText;
        this.displayNameText.innerHTML = selected_user_display_name;
        this.locationText.innerHTML = found_user.location;
        this.resultCard.style.backgroundImage = 'url(' + found_user.photoURL + ')';
        // Overwrite by linking them to profile
        this.anonChatButton.onclick = function(){
          // Another solution would involve adding and subtracting is-active class attributes
          console.log('Switching to chat');
          this.startNewChat(selected_user_display_name, found_user.photoURL);
          document.getElementById('chat-anchor-label').click();
        }.bind(this);
      }
    }.bind(this)).catch(function(err){
      console.error('Error finding users', err);
    })
  }
};

FriendlyChat.prototype.startNewChat = function(host_display_name, host_profile_url) {
  var currentUser = this.auth.currentUser;
  // Explicit variable grabs a read only value
  var current_user_display_name = this.auth.currentUser.displayName || 'User' + this.auth.currentUser.uid;
  var chatRef = this.database.ref('chats');
  var usernamesRef = this.database.ref('users/usernames');

  console.log(currentUser);
  var chat_meta_data = {
    anon: current_user_display_name,
    host: host_display_name,
    time: Date.now(),
    lastMessage: ""
  };

  // Only grab unique ID to update into users
  // Key is the name of the head node, or ID
  // in the chats node
  var pushKey = chatRef.push(chat_meta_data).key;

  console.log(currentUser);
  console.log('Pushing to users ' + host_display_name + ' and ' + current_user_display_name);
  var updates = {};
  var host_object = {
    host: true,
    profileUrl: host_profile_url
  };
  // Pack in extra meta data of profile Url for quick population
  updates[host_display_name + '/chats/' + pushKey] = host_object;
  updates[current_user_display_name + '/chats/' + pushKey + '/host'] = false;
  this.loadMessages(pushKey);
  return usernamesRef.update(updates).catch(function(err){
    console.log(err);
  });
};

FriendlyChat.prototype.loadConversations = function() {
  var username = this.auth.currentUser.displayName || 'User' + this.auth.currentUser.uid;
  var userChatRef = this.database.ref('users/usernames/' + username + '/chats');
  var setConversation = function(data){
    // data.key represents the chatID
    // val is the childre, or single instance child 'host': true or false
    var val = data.val();
    this.displayConversation(data.key, val.host);
  }.bind(this);
  // Puts a listener function on the list and displays each item
  userChatRef.limitToLast(20).on('child_added', setConversation);
  userChatRef.limitToLast(20).on('child_changed', setConversation);
};

FriendlyChat.prototype.displayConversation = function(key, isHost) {
  var div = document.getElementById(key);
  // Create if DNE
  if(!div) {
    var container = document.createElement('div');
    container.innerHTML = FriendlyChat.CHAT_TEMPLATE;
    div = container.firstChild;
    div.setAttribute('id', key);
    this.conversationList.appendChild(div);
  }
  if(isHost){
    // Asker profile picture is Anonymous

  } else {
    // You are the anonymous talking to a known user

  }
};

window.onload = function() {
  console.log('Window loaded');
  window.friendlyChat = new FriendlyChat();
};