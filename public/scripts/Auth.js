import API from "./API.js";
import Router from "./Router.js";

const Auth = {
    isLoggedIn: false,
    account: null,
    loginStep: 1,
    logout: () => {
        Auth.isLoggedIn = false;
        Auth.account = null;
        Auth.updateStatus();
        Router.go("/");
    },
    async checkAuthOptions() {
        const response = await API.checkAuthOptions({
            email: document.getElementById("login_email").value
        })
        document.getElementById("login_section_password").hidden
            = !response.password
        document.getElementById("login_section_webauthn").hidden
            = !response.webauthn
        Auth.loginStep = 2;
    },
    async addWebAuthn() {
        const options = await API.webAuthn.registrationOptions();
        options.authenticatorSelection.residentKey = 'required';
        options.authenticatorSelection.requireResidentKey = true;
        options.extensions = {
            credProps: true
        }
        const authRes = await SimpleWebAuthnBrowser.startRegistration(options);
        const verificationRes = await API.webAuthn.registrationVerification(authRes);
        if (verificationRes.ok) {
            alert("You are ready to log in with your passkey next time")
        } else {
            alert(verificationRes.message)
        }
    },
    async loginWebAuthn() {
        const email = document.getElementById("login_email").value;
        const options = await API.webAuthn.loginOptions(email);
        const loginRes = await SimpleWebAuthnBrowser.startAuthentication(options);
        const verificationRes = await API.webAuthn.loginVerification(email, loginRes);
        if (verificationRes) {
            // Passkey worked! and we have a user to log in
            Auth.postLogin(verificationRes, verificationRes.user);
        } else {
            alert(verificationRes.message)
        }
    },
    async login(event) {
        event.preventDefault();
        if (Auth.loginStep==1) {
            // we need to check options
            Auth.checkAuthOptions();
        } else {
            // We will send password
            const user = { 
                email: document.getElementById("login_email").value,
                password: document.getElementById("login_password").value
            }
            const response = await API.login(user);
            user.name = response.name;
            Auth.postLogin(response, user);
        }
        
    },
    async register(event) {
        event.preventDefault();
        const user = {
            email: document.getElementById("register_email").value,
            password: document.getElementById("register_password").value,
            name: document.getElementById("register_name").value
        }
        const response = await API.register(user);
        Auth.postLogin(response, user);
    },
    async postLogin(response, user) {
        if (response.ok) {
            Auth.isLoggedIn = true;
            Auth.account = user;
            Auth.updateStatus();
            Router.go("/account");
            Auth.loginStep = 1;
            // if we enable and we want autologin
            if (window.PasswordCredential) {
                const credentials = new PasswordCredential({
                    id: user.email,
                    password: user.password
                });         
                await navigator.credentials.store(credentials);
            }
            
        } else {
            alert(response.message);
        }
    },
    updateStatus() {
        if (Auth.isLoggedIn && Auth.account) {
            document.querySelectorAll(".logged_out").forEach(
                e => e.style.display = "none"
            );
            document.querySelectorAll(".logged_in").forEach(
                e => e.style.display = "block"
            );
            document.querySelectorAll(".account_name").forEach(
                e => e.innerHTML = Auth.account.name
            );
            document.querySelectorAll(".account_username").forEach(
                e => e.innerHTML = Auth.account.email
            );

        } else {
            document.querySelectorAll(".logged_out").forEach(
                e => e.style.display = "block"
            );
            document.querySelectorAll(".logged_in").forEach(
                e => e.style.display = "none"
            );

        }
    },    
    init: () => {
        Auth.loginStep = 1;
        document.getElementById("login_section_password").hidden = true;
        document.getElementById("login_section_webauthn").hidden = true;
    },
}
Auth.updateStatus();

export default Auth;

// make it a global object
window.Auth = Auth;
