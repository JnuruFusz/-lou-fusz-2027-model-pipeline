/* ---------------------------------------------------------------
   Team Roster — single source of truth for users + roles
   --------------------------------------------------------------- */
const TEAM_ROSTER = [
  {
    name: "Jnuru Goodwin",
    email: "jnurugoodwin48@gmail.com",
    initials: "JG",
    primaryRole: "Builder",
    isAdmin: true,
    defaultView: "my_work",
    inviteKey: "jnuru",
  },
  {
    name: "Scott Touloo",
    email: "scott.touloo@fusz.com",
    initials: "ST",
    primaryRole: "AEO Writer",
    isAdmin: true,
    defaultView: "my_work",
    inviteKey: "scott",
  },
  {
    name: "Chris Pajda",
    email: "chris.pajda@fusz.com",
    initials: "CP",
    primaryRole: "SEO Writer",
    isAdmin: false,
    defaultView: "my_work",
    inviteKey: "chris",
  },
];

function rosterByEmail(email) {
  return TEAM_ROSTER.find((m) => m.email.toLowerCase() === (email || "").toLowerCase()) || null;
}

function rosterByInviteKey(key) {
  return TEAM_ROSTER.find((m) => m.inviteKey === (key || "").toLowerCase()) || null;
}

const statusLabels = {
  needs_seo: "Needs SEO",
  seo_in_progress: "SEO in progress",
  seo_done: "SEO ready",
  needs_build: "Ready to build",
  page_built: "Built — verify",
  live: "Live",
  ignored: "Ignored",
  snoozed: "Snoozed",
  needs_review: "Returned",
};

const aeoLabels = {
  not_started: "AEO pending",
  in_progress: "AEO in progress",
  done: "AEO done",
  not_needed: "AEO not needed",
};

const signalLabels = {
  upcoming: "Upcoming",
  shipped: "Shipped",
  on_lot: "On lot",
};

const dealerAccents = {
  "Lou Fusz Chrysler Jeep Dodge RAM": "#8f98a3",
  "Lou Fusz Mazda": "#808080",
  "Lou Fusz Toyota": "#eb0a1e",
  "Lou Fusz Buick GMC": "#005daa",
  "Lou Fusz Chevrolet": "#c8a95a",
  "Lou Fusz Kia": "#05141F",
  "Lou Fusz Ford": "#003478",
  "Lou Fusz Chrysler Jeep Dodge Ram Vincennes": "#8f98a3",
  "Lou Fusz Kia Evansville": "#05141F",
  "Lou Fusz Kia of Moline": "#05141F",
  "Lou Fusz Kia Terre Haute": "#05141F",
  "Lou Fusz Mazda Evansville": "#808080",
  "Lou Fusz Nissan Moline": "#c3002f",
  "Lou Fusz Subaru St. Louis": "#013c74",
  "Lou Fusz Subaru O'Fallon": "#013c74",
  "Lou Fusz Kia Columbus": "#05141F",
};

const brandAccentOverrides = {
  Kia:       { accent: "#05141F", visible: "#05141F", ink: "#d7e6f2" },
  Mazda:     { accent: "#808080", visible: "#808080", ink: "#eeeeee" },
  Chrysler:  { accent: "#203B68", visible: "#203B68", ink: "#c9dcff" },
  Dodge:     { accent: "#DA0000", visible: "#DA0000", ink: "#ffd1d1" },
  Jeep:      { accent: "#424D07", visible: "#424D07", ink: "#e3ef9a" },
  Ram:       { accent: "#767676", visible: "#767676", ink: "#eeeeee" },
  Toyota:    { accent: "#eb0a1e", visible: "#eb0a1e", ink: "#ffe0e0" },
  Buick:     { accent: "#005daa", visible: "#005daa", ink: "#c9e0ff" },
  Chevrolet: { accent: "#c8a95a", visible: "#a07a20", ink: "#fff4d8" },
  GMC:       { accent: "#005daa", visible: "#005daa", ink: "#c9e0ff" },
  Ford:      { accent: "#003478", visible: "#003478", ink: "#c9d8ff" },
  Nissan:    { accent: "#c3002f", visible: "#c3002f", ink: "#ffe0e8" },
  Subaru:    { accent: "#013c74", visible: "#013c74", ink: "#c9deff" },
  RAM:       { accent: "#767676", visible: "#767676", ink: "#eeeeee" },
};

const transitions = {
  needs_seo: [["seo_in_progress", "Start SEO"], ["seo_done", "Mark SEO done"], ["ignored", "Ignore"], ["snoozed", "Snooze"]],
  seo_in_progress: [["seo_done", "Mark SEO done"], ["needs_seo", "Unclaim"]],
  seo_done: [["needs_build", "Send To Build"], ["live", "Mark Already Live"]],
  needs_build: [["page_built", "Mark Page Built"], ["seo_done", "Return To SEO Done"]],
  page_built: [["live", "Mark Page Live"], ["needs_build", "Reopen"]],
  live: [["needs_review", "Review Page"]],
  ignored: [["needs_seo", "Restore"]],
  snoozed: [["needs_seo", "Unsnooze"]],
  needs_review: [["needs_seo", "Send Back To SEO"], ["live", "Keep Live"]],
};

const embeddedTracker = [
  { id: "lou-fusz-chrysler-jeep-dodge-ram|2027|pacifica", dealer: "Lou Fusz Chrysler Jeep Dodge RAM", year: 2027, make: "Chrysler", model: "Pacifica", pageStatus: "live", trackerStatusRaw: true, trackerRow: 3, source: "sharepoint-2027-tracker" , details: { buildOwner: "Jnuru Goodwin", seoOwner: "Chris Pajda" } },
  { id: "lou-fusz-chrysler-jeep-dodge-ram|2027|1500-srt-trx", dealer: "Lou Fusz Chrysler Jeep Dodge RAM", year: 2027, make: "Ram", model: "1500 SRT TRX", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 18, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-mazda|2027|mazda-cx-50", dealer: "Lou Fusz Mazda", year: 2027, make: "Mazda", model: "Mazda CX-50", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 5, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-mazda|2027|mazda-cx-70", dealer: "Lou Fusz Mazda", year: 2027, make: "Mazda", model: "Mazda CX-70", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 8, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-toyota|2027|land-cruiser", dealer: "Lou Fusz Toyota", year: 2027, make: "Toyota", model: "Land Cruiser", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 2, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-toyota|2027|highlander-ev", dealer: "Lou Fusz Toyota", year: 2027, make: "Toyota", model: "Highlander EV", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 18, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-buick-gmc|2027|terrain", dealer: "Lou Fusz Buick GMC", year: 2027, make: "GMC", model: "Terrain", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 8, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-buick-gmc|2027|sierra-1500", dealer: "Lou Fusz Buick GMC", year: 2027, make: "GMC", model: "Sierra 1500", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 11, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-kia|2027|kia-telluride", dealer: "Lou Fusz Kia", year: 2027, make: "Kia", model: "Kia Telluride", pageStatus: "live", trackerStatusRaw: true, trackerRow: 2, source: "sharepoint-2027-tracker" , details: { buildOwner: "Jnuru Goodwin", seoOwner: "Chris Pajda" } },
  { id: "lou-fusz-kia|2027|seltos", dealer: "Lou Fusz Kia", year: 2027, make: "Kia", model: "Seltos", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 3, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-kia|2027|ev3", dealer: "Lou Fusz Kia", year: 2027, make: "Kia", model: "EV3", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 4, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-chevrolet|2027|equinox", dealer: "Lou Fusz Chevrolet", year: 2027, make: "Chevrolet", model: "Equinox", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 3, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-chevrolet|2027|silverado-1500", dealer: "Lou Fusz Chevrolet", year: 2027, make: "Chevrolet", model: "Silverado 1500", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 7, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-chevrolet|2027|bolt", dealer: "Lou Fusz Chevrolet", year: 2027, make: "Chevrolet", model: "Bolt", pageStatus: "live", trackerStatusRaw: true, trackerRow: 13, source: "sharepoint-2027-tracker" , details: { buildOwner: "Jnuru Goodwin", seoOwner: "Chris Pajda" } },
  { id: "lou-fusz-chrysler-jeep-dodge-ram-vincennes|2027|pacifica", dealer: "Lou Fusz Chrysler Jeep Dodge Ram Vincennes", year: 2027, make: "Chrysler", model: "Pacifica", pageStatus: "live", trackerStatusRaw: true, trackerRow: 3, source: "sharepoint-2027-tracker" , details: { buildOwner: "Jnuru Goodwin", seoOwner: "Chris Pajda" } },
  { id: "lou-fusz-chrysler-jeep-dodge-ram-vincennes|2027|1500-srt-trx", dealer: "Lou Fusz Chrysler Jeep Dodge Ram Vincennes", year: 2027, make: "Ram", model: "1500 SRT TRX", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 24, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-kia-evansville|2027|kia-telluride", dealer: "Lou Fusz Kia Evansville", year: 2027, make: "Kia", model: "Kia Telluride", pageStatus: "live", trackerStatusRaw: true, trackerRow: 2, source: "sharepoint-2027-tracker" , details: { buildOwner: "Jnuru Goodwin", seoOwner: "Chris Pajda" } },
  { id: "lou-fusz-kia-evansville|2027|seltos", dealer: "Lou Fusz Kia Evansville", year: 2027, make: "Kia", model: "Seltos", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 3, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-kia-evansville|2027|ev3", dealer: "Lou Fusz Kia Evansville", year: 2027, make: "Kia", model: "EV3", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 4, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-kia-of-moline|2027|kia-telluride", dealer: "Lou Fusz Kia of Moline", year: 2027, make: "Kia", model: "Kia Telluride", pageStatus: "live", trackerStatusRaw: true, trackerRow: 2, source: "sharepoint-2027-tracker" , details: { buildOwner: "Jnuru Goodwin", seoOwner: "Chris Pajda" } },
  { id: "lou-fusz-kia-of-moline|2027|seltos", dealer: "Lou Fusz Kia of Moline", year: 2027, make: "Kia", model: "Seltos", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 3, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-kia-of-moline|2027|ev3", dealer: "Lou Fusz Kia of Moline", year: 2027, make: "Kia", model: "EV3", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 4, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-kia-terre-haute|2027|kia-telluride", dealer: "Lou Fusz Kia Terre Haute", year: 2027, make: "Kia", model: "Kia Telluride", pageStatus: "live", trackerStatusRaw: true, trackerRow: 2, source: "sharepoint-2027-tracker" , details: { buildOwner: "Jnuru Goodwin", seoOwner: "Chris Pajda" } },
  { id: "lou-fusz-kia-terre-haute|2027|seltos", dealer: "Lou Fusz Kia Terre Haute", year: 2027, make: "Kia", model: "Seltos", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 3, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-kia-terre-haute|2027|ev3", dealer: "Lou Fusz Kia Terre Haute", year: 2027, make: "Kia", model: "EV3", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 4, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-mazda-evansville|2027|mazda-cx-50", dealer: "Lou Fusz Mazda Evansville", year: 2027, make: "Mazda", model: "Mazda CX-50", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 2, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-mazda-evansville|2027|mazda-cx-70", dealer: "Lou Fusz Mazda Evansville", year: 2027, make: "Mazda", model: "Mazda CX-70", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 9, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-nissan-moline|2027|nissan-z", dealer: "Lou Fusz Nissan Moline", year: 2027, make: "Nissan", model: "Nissan Z", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 5, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-subaru-st.-louis|2027|crosstrek", dealer: "Lou Fusz Subaru St. Louis", year: 2027, make: "Subaru", model: "Crosstrek", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 2, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-subaru-st.-louis|2027|crosstrek-hybrid", dealer: "Lou Fusz Subaru St. Louis", year: 2027, make: "Subaru", model: "Crosstrek Hybrid", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 3, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-subaru-st.-louis|2027|getaway-ev", dealer: "Lou Fusz Subaru St. Louis", year: 2027, make: "Subaru", model: "Getaway EV", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 4, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-subaru-o'fallon|2027|crosstrek", dealer: "Lou Fusz Subaru O'Fallon", year: 2027, make: "Subaru", model: "Crosstrek", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 2, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-subaru-o'fallon|2027|crosstrek-hybrid", dealer: "Lou Fusz Subaru O'Fallon", year: 2027, make: "Subaru", model: "Crosstrek Hybrid", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 3, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-subaru-o'fallon|2027|getaway-ev", dealer: "Lou Fusz Subaru O'Fallon", year: 2027, make: "Subaru", model: "Getaway EV", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 4, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-kia-columbus|2027|kia-telluride", dealer: "Lou Fusz Kia Columbus", year: 2027, make: "Kia", model: "Kia Telluride", pageStatus: "live", trackerStatusRaw: true, trackerRow: 2, source: "sharepoint-2027-tracker" , details: { buildOwner: "Jnuru Goodwin", seoOwner: "Chris Pajda" } },
  { id: "lou-fusz-kia-columbus|2027|seltos", dealer: "Lou Fusz Kia Columbus", year: 2027, make: "Kia", model: "Seltos", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 3, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-kia-columbus|2027|ev3", dealer: "Lou Fusz Kia Columbus", year: 2027, make: "Kia", model: "EV3", pageStatus: "needs_seo", trackerStatusRaw: null, trackerRow: 4, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-toyota|2027|camry", dealer: "Lou Fusz Toyota", year: 2027, make: "Toyota", model: "Camry", pageStatus: "seo_done", trackerStatusRaw: null, trackerRow: 5, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-toyota|2027|rav4", dealer: "Lou Fusz Toyota", year: 2027, make: "Toyota", model: "RAV4", pageStatus: "seo_done", trackerStatusRaw: null, trackerRow: 6, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-chevrolet|2027|trax", dealer: "Lou Fusz Chevrolet", year: 2027, make: "Chevrolet", model: "Trax", pageStatus: "seo_done", trackerStatusRaw: null, trackerRow: 9, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-ford|2027|bronco", dealer: "Lou Fusz Ford", year: 2027, make: "Ford", model: "Bronco", pageStatus: "seo_done", trackerStatusRaw: null, trackerRow: 6, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-mazda|2027|cx-5", dealer: "Lou Fusz Mazda", year: 2027, make: "Mazda", model: "CX-5", pageStatus: "needs_build", trackerStatusRaw: null, trackerRow: 10, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-kia|2027|sportage", dealer: "Lou Fusz Kia", year: 2027, make: "Kia", model: "Sportage", pageStatus: "needs_build", trackerStatusRaw: null, trackerRow: 6, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-buick-gmc|2027|acadia", dealer: "Lou Fusz Buick GMC", year: 2027, make: "GMC", model: "Acadia", pageStatus: "needs_build", trackerStatusRaw: null, trackerRow: 14, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-chrysler-jeep-dodge-ram|2027|wrangler", dealer: "Lou Fusz Chrysler Jeep Dodge RAM", year: 2027, make: "Jeep", model: "Wrangler", pageStatus: "needs_build", trackerStatusRaw: null, trackerRow: 9, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-ford|2027|f-150-lightning", dealer: "Lou Fusz Ford", year: 2027, make: "Ford", model: "F-150 Lightning", pageStatus: "page_built", trackerStatusRaw: null, trackerRow: 8, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-toyota|2027|4runner", dealer: "Lou Fusz Toyota", year: 2027, make: "Toyota", model: "4Runner", pageStatus: "page_built", trackerStatusRaw: null, trackerRow: 9, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-chevrolet|2027|tahoe", dealer: "Lou Fusz Chevrolet", year: 2027, make: "Chevrolet", model: "Tahoe", pageStatus: "page_built", trackerStatusRaw: null, trackerRow: 11, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-buick-gmc|2027|yukon", dealer: "Lou Fusz Buick GMC", year: 2027, make: "GMC", model: "Yukon", pageStatus: "needs_review", trackerStatusRaw: null, trackerRow: 15, source: "sharepoint-2027-tracker" },
  { id: "lou-fusz-ford|2027|mustang-mach-e", dealer: "Lou Fusz Ford", year: 2027, make: "Ford", model: "Mustang Mach-E", pageStatus: "needs_review", trackerStatusRaw: null, trackerRow: 10, source: "sharepoint-2027-tracker" },
];

const embeddedSources = [
  { dealer: "Lou Fusz Chrysler Jeep Dodge RAM", shortName: "CJDR", brands: ["Chrysler", "Dodge", "Jeep", "Ram"], inventoryUrl: "https://www.loufuszchryslerjeepdodge.net/new-vehicles/" },
  { dealer: "Lou Fusz Mazda", shortName: "Mazda", brands: ["Mazda"], inventoryUrl: "https://www.mazda.fusz.com/new-vehicles/" },
  { dealer: "Lou Fusz Toyota", shortName: "Toyota", brands: ["Toyota"], inventoryUrl: "https://www.fusztoyota.com/new-vehicles/" },
  { dealer: "Lou Fusz Buick GMC", shortName: "Buick GMC", brands: ["Buick", "GMC"], inventoryUrl: "https://www.loufuszbuickgmc.com/new-vehicles/" },
  { dealer: "Lou Fusz Chevrolet", shortName: "Chevrolet", brands: ["Chevrolet"], inventoryUrl: "https://www.loufuszchevrolet.com/new-vehicles/" },
  { dealer: "Lou Fusz Kia", shortName: "Kia", brands: ["Kia"], inventoryUrl: "https://www.kia.fusz.com/new-vehicles/" },
  { dealer: "Lou Fusz Ford", shortName: "Ford", brands: ["Ford"], inventoryUrl: "https://www.loufuszford.com/new-vehicles/" },
  { dealer: "Lou Fusz Chrysler Jeep Dodge Ram Vincennes", shortName: "CJDR Vincennes", brands: ["Chrysler", "Dodge", "Jeep", "Ram"], inventoryUrl: "https://www.loufuszcjdrvincennes.com/new-vehicles/" },
  { dealer: "Lou Fusz Kia Evansville", shortName: "Kia Evansville", brands: ["Kia"], inventoryUrl: "https://www.evansvillekia.com/" },
  { dealer: "Lou Fusz Kia of Moline", shortName: "Kia Moline", brands: ["Kia"], inventoryUrl: "https://www.loufuszkiamoline.com/new-vehicles/" },
  { dealer: "Lou Fusz Kia Terre Haute", shortName: "Kia Terre Haute", brands: ["Kia"], inventoryUrl: "https://www.loufuszkiaterrehaute.com/new-vehicles/" },
  { dealer: "Lou Fusz Mazda Evansville", shortName: "Mazda Evansville", brands: ["Mazda"], inventoryUrl: "https://www.loufuszmazdaevansville.com/new-vehicles/" },
  { dealer: "Lou Fusz Nissan Moline", shortName: "Nissan Moline", brands: ["Nissan"], inventoryUrl: "https://www.loufusznissanmoline.com/new-vehicles/" },
  { dealer: "Lou Fusz Subaru St. Louis", shortName: "Subaru St. Louis", brands: ["Subaru"], inventoryUrl: "https://www.subaru.fusz.com/new-vehicles/" },
  { dealer: "Lou Fusz Subaru O'Fallon", shortName: "Subaru O'Fallon", brands: ["Subaru"], inventoryUrl: "https://www.fuszsubaru.com/new-vehicles/" },
  { dealer: "Lou Fusz Kia Columbus", shortName: "Kia Columbus", brands: ["Kia"], inventoryUrl: "https://www.loufuszkia.com/new-vehicles/" },
];

