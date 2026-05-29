define(function(require) {
    var core = require('framework/core');
    var networkService = require('services/networkService');
    var accountService = require('services/accountService');
    var joyRideService = require('services/joyRideService');


        return {
            prepareNewLogin: function (options) {
                return networkService
                    .ajaxPost('prepareNewLogin', options);
            },
            prepareLoginWithCredential: function (options) {
                return networkService
                    .ajaxPost('prepareLoginWithCredential', options);
            },
            unattendedLogin: function (bankCredentialId) {
                return networkService
                    .ajaxPost('unattendedLogin', { bankCredentialId: bankCredentialId });
            },

            getAccounts: function (options) {
	            return networkService
		            .ajaxPost('getAccounts', options);
            },

            mobileBankSync: function (bankId, bankCredentialsId, externalAccounts) {
                return networkService
                    .ajaxPost('mobileBankSync', {
                        bankId: bankId,
                        bankCredentialsId: bankCredentialsId,
                        externalAccounts: externalAccounts
                    });
            },

            exchangeToken: function (token) {
                return networkService
                    .ajaxPost('exchangeToken', {
                        token: token
                    });
            },

            changeExternalAccountId: function(existingAccount, newExternalAccountId) {
                return networkService
                    .ajaxPost('mobileBankChangeExternalAccountId', {
                        accountId: existingAccount.accountId,
                        newExternalAccountId: newExternalAccountId
                    });
            },

            removeSavedCredentials: function (bankId, bankCredentialsId) {
                return networkService.ajaxPost('mobileBankRemoveSavedCredentials', {
                    bankId: bankId,
                    bankCredentialsId: bankCredentialsId
                });
            },

            logOff: function () {
                return networkService.ajaxPost('mobileBankLogoff');
            },

            getErrorMessage: function (errorType) {
                var title = this.getLoginErrorMessage(errorType, null);

                switch (errorType) {
                    case 'BlockedCredentials':
                        return {
                            title: title,
                            message: false,
                            buttonText: 'Luk'
                        };
                    case 'LoginInUse':
                        return {
                            title: title,
                            message: false,
                            buttonText: 'Luk'
                        };
                    case 'NetbankDown':
                        return {
                            title: 'Problemer med netbanken',
                            message: 'Der er i øjeblikket problemer med adgangen til netbanken. Prøv venligst igen lidt senere.',
                            buttonText: 'Luk'
                        };
                    default:
                        return {
                            title: title,
                            message: false,
                            buttonText: 'Luk'
                        };
                }
            },

            getLoginErrorMessage: function (error, bank) {
                var supportUrl = bank ? this.getPincodeHelpUrl(bank) : null;

                switch (error) {
                    case 'InvalidCredentials':
                        if (supportUrl)
                            return 'Dit login er forkert. Venligst prøv igen.<br /><a target="_blank" href="' + supportUrl + '">Læs vejledning her</a>.';

                        return 'Dit login er forkert. Venligst prøv igen.';

                    case 'BlockedCredentials':
                        return 'Dit login er blevet spærret. Log på din bank og lav et nyt. Oplever du fortsat problemer kontakt <a href="mailto:support@spiir.dk">support@spiir.dk</a>';

                    case 'CredentialRenewalNeeded':
                        return 'Dit login er udløbet. Log på din bank og lav et nyt. Oplever du fortsat problemer kontakt <a href="mailto:support@spiir.dk">support@spiir.dk</a>';

                    case 'LoginInUse':
                        return 'Vi er allerede igang med at indlæse data for dig.';

                    case 'NetbankDown':
                        return 'Vi oplever i øjeblikket problemer med banken. Prøv igen senere';

                    case 'ExternalAuthenticationTimeout':
                    case 'Timeout':
                        return 'Tabt forbindelsen til banken. Prøv venligst igen';

                    case 'NotCustomerInBank':
                        return 'Kunne ikke finde en aftale i den valgte bank. Prøv venligst igen.';

                    case 'TooManyDeviceActivations':
                        return 'Du har for mange registrerede enheder i din bank. Du kan typisk fjerne enheder i din netbank eller mobilbank.';

                    case 'Cancel':
                    case 'UserCancelled':
                        return 'Du annullerede login. Prøv igen';

                    case 'SessionExpired':
                    case 'SessionNotFound':
                        return 'Din session er udløbet. Prøv igen for at starte en ny';

                    case 'AuthenticationAlreadyStarted':
                    case 'AuthenticationAlreadyCompleted':
                        return 'Din session er allerede i gang. Prøv igen for at starte en ny';

                    default:
                        return this.getUnknownErrorMessage();
                }
            },

            getUnknownErrorMessage: function() {
                return 'Der er desværre sket en fejl i forbindelsen til din bank. Prøv igen eller skriv til <a href="mailto:support@spiir.dk">support@spiir.dk</a> for hjælp.';
            },

            getPincodeHelpUrl: function (bank) {
                if (bank && bank.helpUrl)
                    return bank.helpUrl;

                return 'https://help.spiir.dk/category/127-automatisk-indlsning';
            },

            isAutomaticBank: function (bank) {
                return bank.isAutomatic && !bank.isPartnerBank;
            },
        };
    });
