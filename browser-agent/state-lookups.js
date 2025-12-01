/**
 * State Professional License Board Lookup Configuration
 * Maps professions and states to their respective licensing board websites
 */

const STATE_CONFIGS = {
    // Florida
    FL: {
        real_estate_agent: {
            url: 'https://httpbin.org/html', // Using a test page instead
            formSelector: 'form',
            inputs: {
                licenseType: 'RE',
                county: '',
                name: '',
                licenseNumber: ''
            },
            searchButton: 'input[type="submit"]',
            resultsSelector: 'p',
            dataExtractor: () => {
                // Return mock data for testing
                return {
                    name: 'John Doe',
                    licenseNumber: 'RE123456',
                    licenseType: 'Real Estate Salesperson',
                    status: 'Active',
                    expirationDate: '12/31/2024'
                };
            }
        },
        insurance_agent: {
            url: 'https://www.myfloridalicense.com/PRD_Srch_Result.asp',
            formSelector: '#form1',
            inputs: {
                licenseType: 'AI',
                county: '',
                name: '',
                licenseNumber: ''
            },
            searchButton: 'input[type="submit"]',
            resultsSelector: '.table tbody tr',
            dataExtractor: (row) => {
                const cells = row.querySelectorAll('td');
                return {
                    name: cells[0]?.textContent?.trim() || '',
                    licenseNumber: cells[1]?.textContent?.trim() || '',
                    licenseType: cells[2]?.textContent?.trim() || '',
                    status: cells[3]?.textContent?.trim() || '',
                    expirationDate: cells[4]?.textContent?.trim() || ''
                };
            }
        },
        dentist: {
            url: 'https://floridasdentistry.gov/verify-a-license/',
            formSelector: '#license-verification-form',
            inputs: {
                licenseType: 'dentist',
                lastName: '',
                licenseNumber: ''
            },
            searchButton: 'button[type="submit"]',
            resultsSelector: '.search-results .license-item',
            dataExtractor: (row) => {
                return {
                    name: row.querySelector('.license-name')?.textContent?.trim() || '',
                    licenseNumber: row.querySelector('.license-number')?.textContent?.trim() || '',
                    licenseType: row.querySelector('.license-type')?.textContent?.trim() || '',
                    status: row.querySelector('.license-status')?.textContent?.trim() || '',
                    expirationDate: row.querySelector('.expiration-date')?.textContent?.trim() || ''
                };
            }
        },
        attorney: {
            url: 'https://www.floridabar.org/directory/',
            formSelector: '#attorney-search',
            inputs: {
                lastName: '',
                firstName: '',
                barNumber: ''
            },
            searchButton: 'button[type="submit"]',
            resultsSelector: '.attorney-result',
            dataExtractor: (row) => {
                return {
                    name: row.querySelector('.attorney-name')?.textContent?.trim() || '',
                    barNumber: row.querySelector('.bar-number')?.textContent?.trim() || '',
                    status: row.querySelector('.status')?.textContent?.trim() || '',
                    firm: row.querySelector('.firm')?.textContent?.trim() || '',
                    address: row.querySelector('.address')?.textContent?.trim() || ''
                };
            }
        },
        contractor: {
            url: 'https://www.myfloridalicense.com/PRD_Srch_Result.asp',
            formSelector: '#form1',
            inputs: {
                licenseType: 'CR',
                county: '',
                name: '',
                licenseNumber: ''
            },
            searchButton: 'input[type="submit"]',
            resultsSelector: '.table tbody tr',
            dataExtractor: (row) => {
                const cells = row.querySelectorAll('td');
                return {
                    name: cells[0]?.textContent?.trim() || '',
                    licenseNumber: cells[1]?.textContent?.trim() || '',
                    licenseType: cells[2]?.textContent?.trim() || '',
                    status: cells[3]?.textContent?.trim() || '',
                    expirationDate: cells[4]?.textContent?.trim() || ''
                };
            }
        },
        mortgage: {
            url: 'https://www.nmlsconsumeraccess.org/',
            formSelector: '#placeholder-form',
            inputs: { name: '' },
            searchButton: '#submit',
            resultsSelector: '.result',
            dataExtractor: () => ({})
        },
        financial: {
            url: 'https://adviserinfo.sec.gov/',
            formSelector: '#placeholder-form',
            inputs: { name: '' },
            searchButton: '#submit',
            resultsSelector: '.result',
            dataExtractor: () => ({})
        }
    },

    // Texas
    TX: {
        real_estate_agent: {
            url: 'https://www.trec.texas.gov/apps/license-holder-search/',
            formSelector: '#license-search-form',
            inputs: {
                licenseType: 'SA',
                lastName: '',
                firstName: '',
                licenseNumber: '',
                city: ''
            },
            searchButton: 'button[type="submit"]',
            resultsSelector: '.search-results .license-holder',
            dataExtractor: (row) => {
                return {
                    name: row.querySelector('.license-name')?.textContent?.trim() || '',
                    licenseNumber: row.querySelector('.license-number')?.textContent?.trim() || '',
                    licenseType: row.querySelector('.license-type')?.textContent?.trim() || '',
                    status: row.querySelector('.license-status')?.textContent?.trim() || '',
                    city: row.querySelector('.city')?.textContent?.trim() || ''
                };
            }
        },
        insurance_agent: {
            url: 'https://www.tdi.texas.gov/license/lookup/',
            formSelector: '#license-lookup',
            inputs: {
                licenseType: 'insurance',
                lastName: '',
                firstName: '',
                licenseNumber: ''
            },
            searchButton: 'button[type="submit"]',
            resultsSelector: '.license-result',
            dataExtractor: (row) => {
                return {
                    name: row.querySelector('.license-name')?.textContent?.trim() || '',
                    licenseNumber: row.querySelector('.license-number')?.textContent?.trim() || '',
                    licenseType: row.querySelector('.license-type')?.textContent?.trim() || '',
                    status: row.querySelector('.license-status')?.textContent?.trim() || ''
                };
            }
        },
        dentist: {
            url: 'https://tsbde.texas.gov/verify-a-license/',
            formSelector: '#license-verification',
            inputs: {
                licenseType: 'dentist',
                lastName: '',
                licenseNumber: ''
            },
            searchButton: 'button[type="submit"]',
            resultsSelector: '.search-result',
            dataExtractor: (row) => {
                return {
                    name: row.querySelector('.dentist-name')?.textContent?.trim() || '',
                    licenseNumber: row.querySelector('.license-number')?.textContent?.trim() || '',
                    licenseType: row.querySelector('.license-type')?.textContent?.trim() || '',
                    status: row.querySelector('.license-status')?.textContent?.trim() || ''
                };
            }
        },
        attorney: {
            url: 'https://www.texasbar.com/Am/AttorneySearch.aspx',
            formSelector: '#attorney-search',
            inputs: {
                lastName: '',
                firstName: '',
                barNumber: ''
            },
            searchButton: 'button[type="submit"]',
            resultsSelector: '.attorney-result',
            dataExtractor: (row) => {
                return {
                    name: row.querySelector('.attorney-name')?.textContent?.trim() || '',
                    barNumber: row.querySelector('.bar-number')?.textContent?.trim() || '',
                    status: row.querySelector('.status')?.textContent?.trim() || '',
                    firm: row.querySelector('.firm')?.textContent?.trim() || ''
                };
            }
        },
        contractor: {
            url: 'https://www.tdlr.texas.gov/contractor/',
            formSelector: '#contractor-search',
            inputs: {
                licenseType: 'contractor',
                lastName: '',
                licenseNumber: '',
                city: ''
            },
            searchButton: 'button[type="submit"]',
            resultsSelector: '.contractor-result',
            dataExtractor: (row) => {
                return {
                    name: row.querySelector('.contractor-name')?.textContent?.trim() || '',
                    licenseNumber: row.querySelector('.license-number')?.textContent?.trim() || '',
                    licenseType: row.querySelector('.license-type')?.textContent?.trim() || '',
                    status: row.querySelector('.license-status')?.textContent?.trim() || ''
                };
            }
        },
        mortgage: {
            url: 'https://www.nmlsconsumeraccess.org/',
            formSelector: '#placeholder-form',
            inputs: { name: '' },
            searchButton: '#submit',
            resultsSelector: '.result',
            dataExtractor: () => ({})
        },
        financial: {
            url: 'https://adviserinfo.sec.gov/',
            formSelector: '#placeholder-form',
            inputs: { name: '' },
            searchButton: '#submit',
            resultsSelector: '.result',
            dataExtractor: () => ({})
        }
    },

    // California
    CA: {
        real_estate_agent: {
            url: 'https://www.dre.ca.gov/licensees/',
            formSelector: '#license-search',
            inputs: {
                licenseType: 'salesperson',
                lastName: '',
                firstName: '',
                licenseNumber: ''
            },
            searchButton: 'button[type="submit"]',
            resultsSelector: '.license-result',
            dataExtractor: (row) => {
                return {
                    name: row.querySelector('.license-name')?.textContent?.trim() || '',
                    licenseNumber: row.querySelector('.license-number')?.textContent?.trim() || '',
                    licenseType: row.querySelector('.license-type')?.textContent?.trim() || '',
                    status: row.querySelector('.license-status')?.textContent?.trim() || ''
                };
            }
        },
        insurance_agent: {
            url: 'https://www.insurance.ca.gov/license-status/',
            formSelector: '#license-search',
            inputs: {
                licenseType: 'insurance',
                lastName: '',
                firstName: '',
                licenseNumber: ''
            },
            searchButton: 'button[type="submit"]',
            resultsSelector: '.license-result',
            dataExtractor: (row) => {
                return {
                    name: row.querySelector('.license-name')?.textContent?.trim() || '',
                    licenseNumber: row.querySelector('.license-number')?.textContent?.trim() || '',
                    licenseType: row.querySelector('.license-type')?.textContent?.trim() || '',
                    status: row.querySelector('.license-status')?.textContent?.trim() || ''
                };
            }
        },
        dentist: {
            url: 'https://www.dentalboard.ca.gov/license/lookup/',
            formSelector: '#license-lookup',
            inputs: {
                licenseType: 'dentist',
                lastName: '',
                licenseNumber: ''
            },
            searchButton: 'button[type="submit"]',
            resultsSelector: '.license-result',
            dataExtractor: (row) => {
                return {
                    name: row.querySelector('.license-name')?.textContent?.trim() || '',
                    licenseNumber: row.querySelector('.license-number')?.textContent?.trim() || '',
                    licenseType: row.querySelector('.license-type')?.textContent?.trim() || '',
                    status: row.querySelector('.license-status')?.textContent?.trim() || ''
                };
            }
        },
        attorney: {
            url: 'https://www.calbar.ca.gov/Attorney-Lookup',
            formSelector: '#attorney-search',
            inputs: {
                lastName: '',
                firstName: '',
                barNumber: ''
            },
            searchButton: 'button[type="submit"]',
            resultsSelector: '.attorney-result',
            dataExtractor: (row) => {
                return {
                    name: row.querySelector('.attorney-name')?.textContent?.trim() || '',
                    barNumber: row.querySelector('.bar-number')?.textContent?.trim() || '',
                    status: row.querySelector('.status')?.textContent?.trim() || '',
                    firm: row.querySelector('.firm')?.textContent?.trim() || ''
                };
            }
        },
        contractor: {
            url: 'https://www.cslb.ca.gov/OnlineServices/CheckLicense/',
            formSelector: '#license-check',
            inputs: {
                licenseType: 'contractor',
                lastName: '',
                licenseNumber: ''
            },
            searchButton: 'button[type="submit"]',
            resultsSelector: '.license-result',
            dataExtractor: (row) => {
                return {
                    name: row.querySelector('.license-name')?.textContent?.trim() || '',
                    licenseNumber: row.querySelector('.license-number')?.textContent?.trim() || '',
                    licenseType: row.querySelector('.license-type')?.textContent?.trim() || '',
                    status: row.querySelector('.license-status')?.textContent?.trim() || ''
                };
            }
        },
        mortgage: {
            url: 'https://www.nmlsconsumeraccess.org/',
            formSelector: '#placeholder-form',
            inputs: { name: '' },
            searchButton: '#submit',
            resultsSelector: '.result',
            dataExtractor: () => ({})
        },
        financial: {
            url: 'https://adviserinfo.sec.gov/',
            formSelector: '#placeholder-form',
            inputs: { name: '' },
            searchButton: '#submit',
            resultsSelector: '.result',
            dataExtractor: () => ({})
        }
    },

    // New York
    NY: {
        real_estate_agent: {
            url: 'https://dos.ny.gov/licensing/eAccess-realestate',
            formSelector: '#license-search',
            inputs: {
                licenseType: 'salesperson',
                lastName: '',
                firstName: '',
                licenseNumber: ''
            },
            searchButton: 'button[type="submit"]',
            resultsSelector: '.license-result',
            dataExtractor: (row) => {
                return {
                    name: row.querySelector('.license-name')?.textContent?.trim() || '',
                    licenseNumber: row.querySelector('.license-number')?.textContent?.trim() || '',
                    licenseType: row.querySelector('.license-type')?.textContent?.trim() || '',
                    status: row.querySelector('.license-status')?.textContent?.trim() || ''
                };
            }
        },
        insurance_agent: {
            url: 'https://www.dfs.ny.gov/insurance/producer_lookup/',
            formSelector: '#producer-search',
            inputs: {
                licenseType: 'insurance',
                lastName: '',
                firstName: '',
                licenseNumber: ''
            },
            searchButton: 'button[type="submit"]',
            resultsSelector: '.producer-result',
            dataExtractor: (row) => {
                return {
                    name: row.querySelector('.producer-name')?.textContent?.trim() || '',
                    licenseNumber: row.querySelector('.license-number')?.textContent?.trim() || '',
                    licenseType: row.querySelector('.license-type')?.textContent?.trim() || '',
                    status: row.querySelector('.license-status')?.textContent?.trim() || ''
                };
            }
        },
        dentist: {
            url: 'https://www.nysed.gov/op-lookup',
            formSelector: '#profession-lookup',
            inputs: {
                profession: 'dentist',
                lastName: '',
                firstName: '',
                licenseNumber: ''
            },
            searchButton: 'button[type="submit"]',
            resultsSelector: '.license-result',
            dataExtractor: (row) => {
                return {
                    name: row.querySelector('.license-name')?.textContent?.trim() || '',
                    licenseNumber: row.querySelector('.license-number')?.textContent?.trim() || '',
                    licenseType: row.querySelector('.license-type')?.textContent?.trim() || '',
                    status: row.querySelector('.license-status')?.textContent?.trim() || ''
                };
            }
        },
        attorney: {
            url: 'https://www.nycourts.gov/attorneys/',
            formSelector: '#attorney-search',
            inputs: {
                lastName: '',
                firstName: '',
                barNumber: ''
            },
            searchButton: 'button[type="submit"]',
            resultsSelector: '.attorney-result',
            dataExtractor: (row) => {
                return {
                    name: row.querySelector('.attorney-name')?.textContent?.trim() || '',
                    barNumber: row.querySelector('.bar-number')?.textContent?.trim() || '',
                    status: row.querySelector('.status')?.textContent?.trim() || '',
                    firm: row.querySelector('.firm')?.textContent?.trim() || ''
                };
            }
        },
        contractor: {
            url: 'https://www.dos.ny.gov/licensing/contractor/',
            formSelector: '#contractor-search',
            inputs: {
                licenseType: 'contractor',
                lastName: '',
                licenseNumber: ''
            },
            searchButton: 'button[type="submit"]',
            resultsSelector: '.license-result',
            dataExtractor: (row) => {
                return {
                    name: row.querySelector('.license-name')?.textContent?.trim() || '',
                    licenseNumber: row.querySelector('.license-number')?.textContent?.trim() || '',
                    licenseType: row.querySelector('.license-type')?.textContent?.trim() || '',
                    status: row.querySelector('.license-status')?.textContent?.trim() || ''
                };
            }
        },
        mortgage: {
            url: 'https://www.nmlsconsumeraccess.org/',
            formSelector: '#placeholder-form',
            inputs: { name: '' },
            searchButton: '#submit',
            resultsSelector: '.result',
            dataExtractor: () => ({})
        },
        financial: {
            url: 'https://adviserinfo.sec.gov/',
            formSelector: '#placeholder-form',
            inputs: { name: '' },
            searchButton: '#submit',
            resultsSelector: '.result',
            dataExtractor: () => ({})
        }
    }
};

/**
 * Get state configuration for a specific profession
 */
function getStateConfig(state, profession) {
    const stateUpper = state.toUpperCase();
    const professionKey = profession.toLowerCase().replace(/[^a-z]/g, '_');

    if (!STATE_CONFIGS[stateUpper]) {
        throw new Error(`State ${state} is not supported`);
    }

    if (!STATE_CONFIGS[stateUpper][professionKey]) {
        throw new Error(`Profession ${profession} is not supported in state ${state}`);
    }

    return STATE_CONFIGS[stateUpper][professionKey];
}

/**
 * Get all supported states
 */
function getSupportedStates() {
    return Object.keys(STATE_CONFIGS);
}

/**
 * Get all supported professions for a state
 */
function getSupportedProfessions(state) {
    const stateUpper = state.toUpperCase();
    if (!STATE_CONFIGS[stateUpper]) {
        return [];
    }
    return Object.keys(STATE_CONFIGS[stateUpper]);
}

/**
 * Get zip code state mapping (simplified - in production would use proper zip code database)
 */
function getStateFromZip(zip) {
    // First digit of zip code generally indicates region
    const firstDigit = zip.toString().charAt(0);

    switch (firstDigit) {
        case '0': return 'MA'; // Northeast
        case '1': return 'NY'; // Northeast
        case '2': return 'VA'; // Southeast
        case '3': return 'FL'; // Southeast
        case '4': return 'OH'; // Midwest
        case '5': return 'TX'; // South
        case '6': return 'IL'; // Midwest
        case '7': return 'TX'; // South
        case '8': return 'CO'; // Mountain
        case '9': return 'CA'; // West
        default: return 'CA'; // Default to California
    }
}

module.exports = {
    getStateConfig,
    getSupportedStates,
    getSupportedProfessions,
    getStateFromZip
};