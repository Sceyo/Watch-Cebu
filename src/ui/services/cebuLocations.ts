/**
 * Curated Offline Cebu Locations Index (LGUs, Barangays, Landmarks).
 *
 * Provides Tier 2 instant 0ms offline centroid lookup for search auto-zoom.
 * Browser-safe: pure static data and matching functions with zero Node.js dependencies.
 */

export interface CebuLocation {
  name: string;
  city: string;
  lat: number;
  lon: number;
  type: "city" | "municipality" | "barangay" | "landmark";
  alt?: string[];
}

export const CEBU_LOCATIONS: CebuLocation[] = [
  {
    "name": "Cebu City",
    "city": "Cebu City",
    "lat": 10.3157,
    "lon": 123.8854,
    "type": "city",
    "alt": [
      "Cebu"
    ]
  },
  {
    "name": "Mandaue City",
    "city": "Mandaue City",
    "lat": 10.3333,
    "lon": 123.9333,
    "type": "city",
    "alt": [
      "Mandaue"
    ]
  },
  {
    "name": "Lapu-Lapu City",
    "city": "Lapu-Lapu City",
    "lat": 10.3111,
    "lon": 123.9536,
    "type": "city",
    "alt": [
      "Lapu-Lapu",
      "Lapu Lapu",
      "Opon"
    ]
  },
  {
    "name": "Talisay City",
    "city": "Talisay City",
    "lat": 10.2447,
    "lon": 123.8494,
    "type": "city",
    "alt": [
      "Talisay"
    ]
  },
  {
    "name": "Toledo City",
    "city": "Toledo City",
    "lat": 10.3789,
    "lon": 123.6394,
    "type": "city",
    "alt": [
      "Toledo"
    ]
  },
  {
    "name": "Danao City",
    "city": "Danao City",
    "lat": 10.5239,
    "lon": 124.0242,
    "type": "city",
    "alt": [
      "Danao"
    ]
  },
  {
    "name": "Bogo City",
    "city": "Bogo City",
    "lat": 11.05,
    "lon": 124.0056,
    "type": "city",
    "alt": [
      "Bogo"
    ]
  },
  {
    "name": "Carcar City",
    "city": "Carcar City",
    "lat": 10.1067,
    "lon": 123.6433,
    "type": "city",
    "alt": [
      "Carcar"
    ]
  },
  {
    "name": "City of Naga",
    "city": "City of Naga",
    "lat": 10.2089,
    "lon": 123.7578,
    "type": "city",
    "alt": [
      "Naga",
      "Naga City"
    ]
  },
  {
    "name": "Consolacion",
    "city": "Consolacion",
    "lat": 10.3833,
    "lon": 123.95,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Liloan",
    "city": "Liloan",
    "lat": 10.4,
    "lon": 123.9833,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Minglanilla",
    "city": "Minglanilla",
    "lat": 10.2458,
    "lon": 123.7964,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Compostela",
    "city": "Compostela",
    "lat": 10.4556,
    "lon": 124.0111,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Cordova",
    "city": "Cordova",
    "lat": 10.2525,
    "lon": 123.9497,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "San Fernando",
    "city": "San Fernando",
    "lat": 10.1611,
    "lon": 123.7083,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Balamban",
    "city": "Balamban",
    "lat": 10.5,
    "lon": 123.7167,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Barili",
    "city": "Barili",
    "lat": 10.1167,
    "lon": 123.5167,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Argao",
    "city": "Argao",
    "lat": 9.8833,
    "lon": 123.6,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Moalboal",
    "city": "Moalboal",
    "lat": 9.95,
    "lon": 123.4,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Bantayan",
    "city": "Bantayan",
    "lat": 11.1667,
    "lon": 123.7167,
    "type": "municipality",
    "alt": [
      "Bantayan Island"
    ]
  },
  {
    "name": "Daanbantayan",
    "city": "Daanbantayan",
    "lat": 11.2667,
    "lon": 124.0167,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Medellin",
    "city": "Medellin",
    "lat": 11.1333,
    "lon": 123.9667,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "San Remigio",
    "city": "San Remigio",
    "lat": 11,
    "lon": 123.9333,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Tabogon",
    "city": "Tabogon",
    "lat": 10.9333,
    "lon": 124.0333,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Borbon",
    "city": "Borbon",
    "lat": 10.8333,
    "lon": 124.0333,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Sogod",
    "city": "Sogod",
    "lat": 10.75,
    "lon": 124,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Catmon",
    "city": "Catmon",
    "lat": 10.6833,
    "lon": 124.0167,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Carmen",
    "city": "Carmen",
    "lat": 10.5833,
    "lon": 124.0167,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Asturias",
    "city": "Asturias",
    "lat": 10.5667,
    "lon": 123.7167,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Tuburan",
    "city": "Tuburan",
    "lat": 10.7333,
    "lon": 123.8333,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Tabuelan",
    "city": "Tabuelan",
    "lat": 10.95,
    "lon": 123.9,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Aloguinsan",
    "city": "Aloguinsan",
    "lat": 10.2333,
    "lon": 123.55,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Pinamungajan",
    "city": "Pinamungajan",
    "lat": 10.2667,
    "lon": 123.5833,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Dumanjug",
    "city": "Dumanjug",
    "lat": 10.05,
    "lon": 123.4333,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Ronda",
    "city": "Ronda",
    "lat": 9.9833,
    "lon": 123.4333,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Alcantara",
    "city": "Alcantara",
    "lat": 9.9667,
    "lon": 123.4167,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Badian",
    "city": "Badian",
    "lat": 9.8667,
    "lon": 123.4,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Alegria",
    "city": "Alegria",
    "lat": 9.7667,
    "lon": 123.3667,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Malabuyoc",
    "city": "Malabuyoc",
    "lat": 9.6667,
    "lon": 123.3167,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Ginatilan",
    "city": "Ginatilan",
    "lat": 9.5833,
    "lon": 123.3167,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Samboan",
    "city": "Samboan",
    "lat": 9.5167,
    "lon": 123.3,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Santander",
    "city": "Santander",
    "lat": 9.4167,
    "lon": 123.3333,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Oslob",
    "city": "Oslob",
    "lat": 9.5167,
    "lon": 123.4333,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Boljoon",
    "city": "Boljoon",
    "lat": 9.65,
    "lon": 123.4833,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Alcoy",
    "city": "Alcoy",
    "lat": 9.7167,
    "lon": 123.5167,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Dalaguete",
    "city": "Dalaguete",
    "lat": 9.7667,
    "lon": 123.5333,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Sibonga",
    "city": "Sibonga",
    "lat": 9.9833,
    "lon": 123.6167,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Santa Fe",
    "city": "Santa Fe",
    "lat": 11.15,
    "lon": 123.8,
    "type": "municipality",
    "alt": [
      "Sta. Fe",
      "Sta Fe"
    ]
  },
  {
    "name": "Madridejos",
    "city": "Madridejos",
    "lat": 11.2833,
    "lon": 123.7333,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "San Francisco",
    "city": "San Francisco",
    "lat": 10.65,
    "lon": 124.3833,
    "type": "municipality",
    "alt": [
      "San Fran",
      "Camotes"
    ]
  },
  {
    "name": "Poro",
    "city": "Poro",
    "lat": 10.6333,
    "lon": 124.4167,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Tudela",
    "city": "Tudela",
    "lat": 10.65,
    "lon": 124.4667,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Pilar",
    "city": "Pilar",
    "lat": 10.8,
    "lon": 124.55,
    "type": "municipality",
    "alt": []
  },
  {
    "name": "Cebu IT Park",
    "city": "Cebu City",
    "lat": 10.3297,
    "lon": 123.9062,
    "type": "landmark",
    "alt": [
      "IT Park",
      "Asiatown"
    ]
  },
  {
    "name": "Cebu Business Park",
    "city": "Cebu City",
    "lat": 10.3173,
    "lon": 123.9056,
    "type": "landmark",
    "alt": [
      "Ayala",
      "Ayala Center",
      "Ayala Center Cebu"
    ]
  },
  {
    "name": "Fuente Osmeña",
    "city": "Cebu City",
    "lat": 10.3117,
    "lon": 123.8933,
    "type": "landmark",
    "alt": [
      "Fuente",
      "Fuente Osmena",
      "Mango Avenue"
    ]
  },
  {
    "name": "SM City Cebu",
    "city": "Cebu City",
    "lat": 10.3119,
    "lon": 123.9181,
    "type": "landmark",
    "alt": [
      "SM Cebu",
      "SM Mabolo"
    ]
  },
  {
    "name": "SM Seaside City",
    "city": "Cebu City",
    "lat": 10.2818,
    "lon": 123.8814,
    "type": "landmark",
    "alt": [
      "SM Seaside",
      "SRP",
      "South Road Properties"
    ]
  },
  {
    "name": "Colon Street",
    "city": "Cebu City",
    "lat": 10.2974,
    "lon": 123.8997,
    "type": "landmark",
    "alt": [
      "Colon",
      "Downtown Cebu"
    ]
  },
  {
    "name": "Carbon Market",
    "city": "Cebu City",
    "lat": 10.2917,
    "lon": 123.8994,
    "type": "landmark",
    "alt": [
      "Carbon"
    ]
  },
  {
    "name": "Mactan-Cebu International Airport",
    "city": "Lapu-Lapu City",
    "lat": 10.3075,
    "lon": 123.9794,
    "type": "landmark",
    "alt": [
      "MCIA",
      "Mactan Airport",
      "Cebu Airport"
    ]
  },
  {
    "name": "CCLEX",
    "city": "Cordova",
    "lat": 10.2794,
    "lon": 123.9125,
    "type": "landmark",
    "alt": [
      "Cebu-Cordova Link Expressway",
      "Third Bridge"
    ]
  },
  {
    "name": "Tops Lookout",
    "city": "Cebu City",
    "lat": 10.3708,
    "lon": 123.8708,
    "type": "landmark",
    "alt": [
      "Tops",
      "Busay Tops"
    ]
  },
  {
    "name": "Basilica Minore del Sto. Niño",
    "city": "Cebu City",
    "lat": 10.2942,
    "lon": 123.9022,
    "type": "landmark",
    "alt": [
      "Sto Nino",
      "Sto. Nino Church",
      "Basilica del Sto Nino"
    ]
  },
  {
    "name": "Magellan's Cross",
    "city": "Cebu City",
    "lat": 10.2936,
    "lon": 123.902,
    "type": "landmark",
    "alt": [
      "Magellans Cross"
    ]
  },
  {
    "name": "Fort San Pedro",
    "city": "Cebu City",
    "lat": 10.2922,
    "lon": 123.9058,
    "type": "landmark",
    "alt": []
  },
  {
    "name": "Cebu Provincial Capitol",
    "city": "Cebu City",
    "lat": 10.3164,
    "lon": 123.8906,
    "type": "landmark",
    "alt": [
      "Capitol"
    ]
  },
  {
    "name": "Chong Hua Hospital",
    "city": "Cebu City",
    "lat": 10.3131,
    "lon": 123.8925,
    "type": "landmark",
    "alt": [
      "Chong Hua"
    ]
  },
  {
    "name": "Cebu Doctors University Hospital",
    "city": "Cebu City",
    "lat": 10.3142,
    "lon": 123.8911,
    "type": "landmark",
    "alt": [
      "Cebu Doc",
      "CDUH"
    ]
  },
  {
    "name": "Vicente Sotto Memorial Medical Center",
    "city": "Cebu City",
    "lat": 10.3119,
    "lon": 123.8897,
    "type": "landmark",
    "alt": [
      "VSMMC",
      "Vicente Sotto Hospital"
    ]
  },
  {
    "name": "Cebu Ocean Park",
    "city": "Cebu City",
    "lat": 10.2811,
    "lon": 123.8794,
    "type": "landmark",
    "alt": []
  },
  {
    "name": "Il Corso",
    "city": "Cebu City",
    "lat": 10.2694,
    "lon": 123.8722,
    "type": "landmark",
    "alt": [
      "Il Corso Filinvest"
    ]
  },
  {
    "name": "Basak",
    "city": "Lapu-Lapu City",
    "lat": 10.2982,
    "lon": 123.9555,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Marigondon",
    "city": "Lapu-Lapu City",
    "lat": 10.2797,
    "lon": 123.9854,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Mactan",
    "city": "Lapu-Lapu City",
    "lat": 10.3061,
    "lon": 124.0152,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Pusok",
    "city": "Lapu-Lapu City",
    "lat": 10.3228,
    "lon": 123.9697,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Bankal",
    "city": "Lapu-Lapu City",
    "lat": 10.3092,
    "lon": 123.9811,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Gun-ob",
    "city": "Lapu-Lapu City",
    "lat": 10.3086,
    "lon": 123.9431,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Pajac",
    "city": "Lapu-Lapu City",
    "lat": 10.2917,
    "lon": 123.9875,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Pajo",
    "city": "Lapu-Lapu City",
    "lat": 10.3178,
    "lon": 123.9525,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Agus",
    "city": "Lapu-Lapu City",
    "lat": 10.2833,
    "lon": 123.9722,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Subabasbas",
    "city": "Lapu-Lapu City",
    "lat": 10.2667,
    "lon": 123.9667,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Buaya",
    "city": "Lapu-Lapu City",
    "lat": 10.3236,
    "lon": 123.9889,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Punta Engaño",
    "city": "Lapu-Lapu City",
    "lat": 10.3333,
    "lon": 124.05,
    "type": "barangay",
    "alt": [
      "Punta Engano"
    ]
  },
  {
    "name": "Maribago",
    "city": "Lapu-Lapu City",
    "lat": 10.2889,
    "lon": 124,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Babag",
    "city": "Lapu-Lapu City",
    "lat": 10.2886,
    "lon": 123.9367,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Poblacion",
    "city": "Cordova",
    "lat": 10.2525,
    "lon": 123.9497,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Cogon",
    "city": "Cordova",
    "lat": 10.25,
    "lon": 123.94,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Gabi",
    "city": "Cordova",
    "lat": 10.2667,
    "lon": 123.9556,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Bangbang",
    "city": "Cordova",
    "lat": 10.2556,
    "lon": 123.9389,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Catarman",
    "city": "Cordova",
    "lat": 10.2611,
    "lon": 123.9333,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Day-as",
    "city": "Cordova",
    "lat": 10.2444,
    "lon": 123.9611,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Ibabao",
    "city": "Cordova",
    "lat": 10.2611,
    "lon": 123.9611,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Pilipog",
    "city": "Cordova",
    "lat": 10.2722,
    "lon": 123.9389,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "San Miguel",
    "city": "Cordova",
    "lat": 10.2556,
    "lon": 123.9556,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Adlaon",
    "city": "Cebu City",
    "lat": 10.43691,
    "lon": 123.86795,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Apas",
    "city": "Cebu City",
    "lat": 10.3375,
    "lon": 123.90557,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Babag Ⅱ",
    "city": "Cebu City",
    "lat": 10.37397,
    "lon": 123.85,
    "type": "barangay",
    "alt": [
      "Babag Dos"
    ]
  },
  {
    "name": "Banawa",
    "city": "Cebu City",
    "lat": 10.31802,
    "lon": 123.87805,
    "type": "barangay",
    "alt": [
      "Sitio Banawa"
    ]
  },
  {
    "name": "Banilad",
    "city": "Cebu City",
    "lat": 10.34652,
    "lon": 123.91111,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Basak Pardo",
    "city": "Cebu City",
    "lat": 10.28646,
    "lon": 123.86457,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Basak San Nicolas",
    "city": "Cebu City",
    "lat": 10.28647,
    "lon": 123.87032,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Binaliw",
    "city": "Cebu City",
    "lat": 10.42279,
    "lon": 123.91608,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Binaliw Barangay Disaster Risk Reduction and Management Committee",
    "city": "Cebu City",
    "lat": 10.42277,
    "lon": 123.91589,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Buhisan",
    "city": "Cebu City",
    "lat": 10.30879,
    "lon": 123.85347,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Bulacao",
    "city": "Cebu City",
    "lat": 10.2755,
    "lon": 123.85138,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Bulacao Health Center",
    "city": "Cebu City",
    "lat": 10.27541,
    "lon": 123.8513,
    "type": "barangay",
    "alt": [
      "Bulacao Health Center"
    ]
  },
  {
    "name": "Buot",
    "city": "Cebu City",
    "lat": 10.34797,
    "lon": 123.80814,
    "type": "barangay",
    "alt": [
      "Buot-Taup Pardo"
    ]
  },
  {
    "name": "Calamba",
    "city": "Cebu City",
    "lat": 10.30161,
    "lon": 123.88454,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Camputhaw",
    "city": "Cebu City",
    "lat": 10.31824,
    "lon": 123.89715,
    "type": "barangay",
    "alt": [
      "Kamputhaw"
    ]
  },
  {
    "name": "Capitol Site",
    "city": "Cebu City",
    "lat": 10.32469,
    "lon": 123.89024,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Carreta",
    "city": "Cebu City",
    "lat": 10.3082,
    "lon": 123.91492,
    "type": "barangay",
    "alt": [
      "Village Gonzalo"
    ]
  },
  {
    "name": "Carreta Barangay Disaster Risk Reduction and Management Committee",
    "city": "Cebu City",
    "lat": 10.308,
    "lon": 123.90869,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Cogon Pardo",
    "city": "Cebu City",
    "lat": 10.2774,
    "lon": 123.86212,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Cogon Ramos",
    "city": "Cebu City",
    "lat": 10.30494,
    "lon": 123.89839,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Day-as",
    "city": "Cebu City",
    "lat": 10.30145,
    "lon": 123.90225,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Duljo Fatima",
    "city": "Cebu City",
    "lat": 10.29171,
    "lon": 123.88491,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Ermita",
    "city": "Cebu City",
    "lat": 10.29166,
    "lon": 123.89741,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Guadalupe",
    "city": "Cebu City",
    "lat": 10.32288,
    "lon": 123.88394,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Guba",
    "city": "Cebu City",
    "lat": 10.42823,
    "lon": 123.8899,
    "type": "barangay",
    "alt": [
      "Barangay Guba"
    ]
  },
  {
    "name": "Hipodromo",
    "city": "Cebu City",
    "lat": 10.31407,
    "lon": 123.90701,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Hipodromo Local Government Unit",
    "city": "Cebu City",
    "lat": 10.31406,
    "lon": 123.90686,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Holy Family Village",
    "city": "Cebu City",
    "lat": 10.3442,
    "lon": 123.91329,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Holy Name",
    "city": "Cebu City",
    "lat": 10.32035,
    "lon": 123.91787,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Inayawan",
    "city": "Cebu City",
    "lat": 10.27024,
    "lon": 123.85638,
    "type": "barangay",
    "alt": [
      "Inayawan Pardo"
    ]
  },
  {
    "name": "Kalubihan",
    "city": "Cebu City",
    "lat": 10.2977,
    "lon": 123.8991,
    "type": "barangay",
    "alt": [
      "Cebu City Downtown"
    ]
  },
  {
    "name": "Kalunasan",
    "city": "Cebu City",
    "lat": 10.3389,
    "lon": 123.8796,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Kamagayan",
    "city": "Cebu City",
    "lat": 10.29976,
    "lon": 123.89955,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Kasambagan",
    "city": "Cebu City",
    "lat": 10.32509,
    "lon": 123.91133,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Kinasang-an Pardo",
    "city": "Cebu City",
    "lat": 10.28227,
    "lon": 123.85909,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Labangon",
    "city": "Cebu City",
    "lat": 10.29939,
    "lon": 123.87909,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Lahug",
    "city": "Cebu City",
    "lat": 10.33093,
    "lon": 123.89813,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Lorega",
    "city": "Cebu City",
    "lat": 10.30655,
    "lon": 123.90422,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Lower Acacia",
    "city": "Cebu City",
    "lat": 10.28059,
    "lon": 123.85908,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Luz",
    "city": "Cebu City",
    "lat": 10.3211,
    "lon": 123.9078,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Mabolo",
    "city": "Cebu City",
    "lat": 10.3143,
    "lon": 123.9147,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Magpalacir",
    "city": "Cebu City",
    "lat": 10.31448,
    "lon": 123.90634,
    "type": "barangay",
    "alt": [
      "Sitio Magpalacir"
    ]
  },
  {
    "name": "Malubog",
    "city": "Cebu City",
    "lat": 10.38039,
    "lon": 123.86927,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Mambaling",
    "city": "Cebu City",
    "lat": 10.29112,
    "lon": 123.87726,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Mangabon",
    "city": "Cebu City",
    "lat": 10.47536,
    "lon": 123.85372,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Maria Luisa Estate",
    "city": "Cebu City",
    "lat": 10.3498,
    "lon": 123.90474,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Nalupi",
    "city": "Cebu City",
    "lat": 10.2794,
    "lon": 123.86021,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Nivel Hills",
    "city": "Cebu City",
    "lat": 10.34234,
    "lon": 123.89542,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "OPRRA",
    "city": "Cebu City",
    "lat": 10.3292,
    "lon": 123.8874,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Pahina Central",
    "city": "Cebu City",
    "lat": 10.29657,
    "lon": 123.8924,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Pahina San Nicolas",
    "city": "Cebu City",
    "lat": 10.29401,
    "lon": 123.89281,
    "type": "barangay",
    "alt": [
      "Pahina"
    ]
  },
  {
    "name": "Pailob",
    "city": "Cebu City",
    "lat": 10.30262,
    "lon": 123.88926,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Pamutan",
    "city": "Cebu City",
    "lat": 10.33345,
    "lon": 123.83548,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Panagdait",
    "city": "Cebu City",
    "lat": 10.32565,
    "lon": 123.91766,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Pardo Health Center",
    "city": "Cebu City",
    "lat": 10.27921,
    "lon": 123.8556,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Pari-an",
    "city": "Cebu City",
    "lat": 10.29886,
    "lon": 123.90266,
    "type": "barangay",
    "alt": [
      "Parian"
    ]
  },
  {
    "name": "Pasil",
    "city": "Cebu City",
    "lat": 10.29019,
    "lon": 123.89467,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Poblacion Pardo",
    "city": "Cebu City",
    "lat": 10.27943,
    "lon": 123.85542,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Pulangbato",
    "city": "Cebu City",
    "lat": 10.39794,
    "lon": 123.90632,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Pung-ol Sibugay",
    "city": "Cebu City",
    "lat": 10.39695,
    "lon": 123.84955,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Punta Princesa",
    "city": "Cebu City",
    "lat": 10.29493,
    "lon": 123.87017,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Punta Princesa Barangay Disaster Risk Reduction and Management Committee",
    "city": "Cebu City",
    "lat": 10.29522,
    "lon": 123.87181,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Purok 1",
    "city": "Cebu City",
    "lat": 10.37826,
    "lon": 123.91777,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Purok 4",
    "city": "Cebu City",
    "lat": 10.31916,
    "lon": 123.89703,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Purok 8",
    "city": "Cebu City",
    "lat": 10.322,
    "lon": 123.8962,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Quiot Pardo",
    "city": "Cebu City",
    "lat": 10.28899,
    "lon": 123.85862,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Riverside",
    "city": "Cebu City",
    "lat": 10.3335,
    "lon": 123.87196,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sambag I",
    "city": "Cebu City",
    "lat": 10.30081,
    "lon": 123.89204,
    "type": "barangay",
    "alt": [
      "Sambag 1"
    ]
  },
  {
    "name": "Sambag Ⅱ",
    "city": "Cebu City",
    "lat": 10.30583,
    "lon": 123.89122,
    "type": "barangay",
    "alt": [
      "Sambag 2"
    ]
  },
  {
    "name": "San Antonio",
    "city": "Cebu City",
    "lat": 10.30187,
    "lon": 123.89834,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "San Jose",
    "city": "Cebu City",
    "lat": 10.37909,
    "lon": 123.91644,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "San Jose Barangay Health Station",
    "city": "Cebu City",
    "lat": 10.37902,
    "lon": 123.91641,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "San Nicolas Proper",
    "city": "Cebu City",
    "lat": 10.29493,
    "lon": 123.89055,
    "type": "barangay",
    "alt": [
      "San Nicolas Central"
    ]
  },
  {
    "name": "San Roque",
    "city": "Cebu City",
    "lat": 10.29392,
    "lon": 123.90602,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Kabataan ng Babag",
    "city": "Cebu City",
    "lat": 10.37406,
    "lon": 123.84968,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Kabataan ng Binaliw",
    "city": "Cebu City",
    "lat": 10.42279,
    "lon": 123.91589,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Kabataan ng Bulacao",
    "city": "Cebu City",
    "lat": 10.27539,
    "lon": 123.85128,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Kabataan ng Carreta",
    "city": "Cebu City",
    "lat": 10.30801,
    "lon": 123.9087,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Kabataan ng Guadalupe",
    "city": "Cebu City",
    "lat": 10.32287,
    "lon": 123.88407,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Kabataan ng Hipodromo",
    "city": "Cebu City",
    "lat": 10.31408,
    "lon": 123.90698,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Kabataan ng Poblacion Pardo",
    "city": "Cebu City",
    "lat": 10.27925,
    "lon": 123.85553,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Kabataan ng Punta Princesa",
    "city": "Cebu City",
    "lat": 10.2952,
    "lon": 123.87183,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Kabataan ng San Jose",
    "city": "Cebu City",
    "lat": 10.37904,
    "lon": 123.91646,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Kabataan ng Sawang Calero",
    "city": "Cebu City",
    "lat": 10.29227,
    "lon": 123.89111,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Kabataan ng Sinsin",
    "city": "Cebu City",
    "lat": 10.34493,
    "lon": 123.78095,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Kabataan ng Talamban",
    "city": "Cebu City",
    "lat": 10.3698,
    "lon": 123.91833,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Pambarangay ng Babag",
    "city": "Cebu City",
    "lat": 10.37408,
    "lon": 123.84968,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Pambarangay ng Binaliw",
    "city": "Cebu City",
    "lat": 10.42274,
    "lon": 123.91589,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Pambarangay ng Bulacao",
    "city": "Cebu City",
    "lat": 10.2754,
    "lon": 123.85128,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Pambarangay ng Carreta",
    "city": "Cebu City",
    "lat": 10.30798,
    "lon": 123.90868,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Pambarangay ng Guadalupe",
    "city": "Cebu City",
    "lat": 10.32285,
    "lon": 123.88408,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Pambarangay ng Hippodromo",
    "city": "Cebu City",
    "lat": 10.3141,
    "lon": 123.90697,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Pambarangay ng Paril",
    "city": "Cebu City",
    "lat": 10.47475,
    "lon": 123.91586,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Pambarangay ng Poblacion Pardo",
    "city": "Cebu City",
    "lat": 10.27926,
    "lon": 123.85552,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Pambarangay ng Punta Princesa",
    "city": "Cebu City",
    "lat": 10.29524,
    "lon": 123.8718,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Pambarangay ng San Jose",
    "city": "Cebu City",
    "lat": 10.37905,
    "lon": 123.91643,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Pambarangay ng Sawang Calero",
    "city": "Cebu City",
    "lat": 10.2923,
    "lon": 123.89111,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Pambarangay ng Sinsin",
    "city": "Cebu City",
    "lat": 10.34495,
    "lon": 123.78095,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Pambarangay ng Talamban",
    "city": "Cebu City",
    "lat": 10.36977,
    "lon": 123.91835,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Santa Cruz",
    "city": "Cebu City",
    "lat": 10.30607,
    "lon": 123.89588,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sapangdaku",
    "city": "Cebu City",
    "lat": 10.33504,
    "lon": 123.87266,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sawang Calero",
    "city": "Cebu City",
    "lat": 10.29117,
    "lon": 123.89079,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sawang Calero Barangay Disaster Risk Reduction and Management Committee",
    "city": "Cebu City",
    "lat": 10.29229,
    "lon": 123.89111,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Señor Santo Niño",
    "city": "Cebu City",
    "lat": 10.29512,
    "lon": 123.90283,
    "type": "barangay",
    "alt": [
      "Poblacion"
    ]
  },
  {
    "name": "Sin-sin",
    "city": "Cebu City",
    "lat": 10.34494,
    "lon": 123.78101,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sirao",
    "city": "Cebu City",
    "lat": 10.41413,
    "lon": 123.87221,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Son-oc",
    "city": "Cebu City",
    "lat": 10.37732,
    "lon": 123.91717,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "South Reclamation Area",
    "city": "Cebu City",
    "lat": 10.27514,
    "lon": 123.87446,
    "type": "barangay",
    "alt": [
      "SRP",
      "South Road Properties",
      "Cebu South Road Properties",
      "City South Special Economic Administrative Zone"
    ]
  },
  {
    "name": "Suba",
    "city": "Cebu City",
    "lat": 10.29003,
    "lon": 123.89381,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sudlon I",
    "city": "Cebu City",
    "lat": 10.36356,
    "lon": 123.78629,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sudlon II",
    "city": "Cebu City",
    "lat": 10.37958,
    "lon": 123.78467,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sun-oc",
    "city": "Cebu City",
    "lat": 10.33824,
    "lon": 123.89502,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "T. Padilla",
    "city": "Cebu City",
    "lat": 10.30181,
    "lon": 123.90429,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Tabunan",
    "city": "Cebu City",
    "lat": 10.43973,
    "lon": 123.82137,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Tagba-o",
    "city": "Cebu City",
    "lat": 10.44252,
    "lon": 123.83992,
    "type": "barangay",
    "alt": [
      "Tagbao"
    ]
  },
  {
    "name": "Talamban",
    "city": "Cebu City",
    "lat": 10.36936,
    "lon": 123.91693,
    "type": "barangay",
    "alt": [
      "Barangay Talamban"
    ]
  },
  {
    "name": "Talamban Barangay Disaster Risk Reduction and Management Committee",
    "city": "Cebu City",
    "lat": 10.36979,
    "lon": 123.91834,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Talamban Local Government Unit",
    "city": "Cebu City",
    "lat": 10.36982,
    "lon": 123.91847,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Talamban VAW Desk",
    "city": "Cebu City",
    "lat": 10.36984,
    "lon": 123.91846,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Taptap",
    "city": "Cebu City",
    "lat": 10.42993,
    "lon": 123.84796,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Tejero",
    "city": "Cebu City",
    "lat": 10.30197,
    "lon": 123.90742,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "The Peaks",
    "city": "Cebu City",
    "lat": 10.32382,
    "lon": 123.86617,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Tiguib",
    "city": "Cebu City",
    "lat": 10.37897,
    "lon": 123.86842,
    "type": "barangay",
    "alt": [
      "Tigib"
    ]
  },
  {
    "name": "Tinago",
    "city": "Cebu City",
    "lat": 10.29859,
    "lon": 123.90815,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Tisa",
    "city": "Cebu City",
    "lat": 10.30206,
    "lon": 123.86896,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Zapatera",
    "city": "Cebu City",
    "lat": 10.30637,
    "lon": 123.90127,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Cabangahan",
    "city": "Consolacion",
    "lat": 10.40396,
    "lon": 123.92463,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Calachuchi",
    "city": "Consolacion",
    "lat": 10.36275,
    "lon": 123.98245,
    "type": "barangay",
    "alt": [
      "Purok 2",
      "Purok Calachuchi"
    ]
  },
  {
    "name": "Cansaga",
    "city": "Consolacion",
    "lat": 10.37762,
    "lon": 123.96147,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Casili",
    "city": "Consolacion",
    "lat": 10.37408,
    "lon": 123.94805,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Danglag",
    "city": "Consolacion",
    "lat": 10.39023,
    "lon": 123.95623,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Garing",
    "city": "Consolacion",
    "lat": 10.41968,
    "lon": 123.94507,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Jugan",
    "city": "Consolacion",
    "lat": 10.37849,
    "lon": 123.97229,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Lamac",
    "city": "Consolacion",
    "lat": 10.38769,
    "lon": 123.9681,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Lanipga",
    "city": "Consolacion",
    "lat": 10.4577,
    "lon": 123.93297,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Nangka",
    "city": "Consolacion",
    "lat": 10.37075,
    "lon": 123.96282,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Panas",
    "city": "Consolacion",
    "lat": 10.44659,
    "lon": 123.93069,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Panoypoy",
    "city": "Consolacion",
    "lat": 10.41782,
    "lon": 123.92874,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Pitogo",
    "city": "Consolacion",
    "lat": 10.38266,
    "lon": 123.97116,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Poblacion Occidental",
    "city": "Consolacion",
    "lat": 10.37419,
    "lon": 123.95294,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Poblacion Occidental Barangay Health Station",
    "city": "Consolacion",
    "lat": 10.37343,
    "lon": 123.95356,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Poblacion Oriental",
    "city": "Consolacion",
    "lat": 10.37531,
    "lon": 123.9572,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Poblacion Oriental Barangay Hall",
    "city": "Consolacion",
    "lat": 10.37544,
    "lon": 123.95719,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Polog",
    "city": "Consolacion",
    "lat": 10.40732,
    "lon": 123.94248,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Pulpogan",
    "city": "Consolacion",
    "lat": 10.3858,
    "lon": 123.95696,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sacsac",
    "city": "Consolacion",
    "lat": 10.39745,
    "lon": 123.92777,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Kabataan ng Panoypoy",
    "city": "Consolacion",
    "lat": 10.41825,
    "lon": 123.92903,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Kabataan ng Poblacion Occidental",
    "city": "Consolacion",
    "lat": 10.37341,
    "lon": 123.95361,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Kabataan ng Sacsac",
    "city": "Consolacion",
    "lat": 10.39752,
    "lon": 123.9278,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Kabataan ng Tayud",
    "city": "Consolacion",
    "lat": 10.3629,
    "lon": 123.98255,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Pambarangay ng Panoypoy",
    "city": "Consolacion",
    "lat": 10.41826,
    "lon": 123.92902,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Pambarangay ng poblacion Occidental",
    "city": "Consolacion",
    "lat": 10.37342,
    "lon": 123.95362,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Pambarangay ng Sacsac",
    "city": "Consolacion",
    "lat": 10.3975,
    "lon": 123.92779,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Pambarangay ng Tayud",
    "city": "Consolacion",
    "lat": 10.36292,
    "lon": 123.98256,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Tagaytay",
    "city": "Consolacion",
    "lat": 10.40047,
    "lon": 123.96199,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Tayud",
    "city": "Consolacion",
    "lat": 10.36241,
    "lon": 123.98243,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Tilhaong",
    "city": "Consolacion",
    "lat": 10.39868,
    "lon": 123.96333,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Tolotolo",
    "city": "Consolacion",
    "lat": 10.39216,
    "lon": 123.94231,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Tugbongan",
    "city": "Consolacion",
    "lat": 10.36327,
    "lon": 123.96576,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Villa Monilar",
    "city": "Consolacion",
    "lat": 10.37994,
    "lon": 123.97396,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Cabadiangan",
    "city": "Liloan",
    "lat": 10.44548,
    "lon": 123.96915,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Calero",
    "city": "Liloan",
    "lat": 10.36326,
    "lon": 123.99861,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Camote",
    "city": "Liloan",
    "lat": 10.36246,
    "lon": 123.9958,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Catarman",
    "city": "Liloan",
    "lat": 10.38682,
    "lon": 124.01096,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Catarman Barangay Disaster Risk Reduction and Management Committee",
    "city": "Liloan",
    "lat": 10.38685,
    "lon": 124.01098,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Cotcot",
    "city": "Liloan",
    "lat": 10.42758,
    "lon": 124.00167,
    "type": "barangay",
    "alt": [
      "Kotkot"
    ]
  },
  {
    "name": "Jubay",
    "city": "Liloan",
    "lat": 10.41506,
    "lon": 123.99684,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Kamatis",
    "city": "Liloan",
    "lat": 10.36824,
    "lon": 123.99592,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Lataban",
    "city": "Liloan",
    "lat": 10.432,
    "lon": 123.96303,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Mulao",
    "city": "Liloan",
    "lat": 10.46519,
    "lon": 123.95165,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Orchids",
    "city": "Liloan",
    "lat": 10.39306,
    "lon": 123.97867,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Poblacion",
    "city": "Liloan",
    "lat": 10.39894,
    "lon": 124.0003,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "San Roque",
    "city": "Liloan",
    "lat": 10.43587,
    "lon": 123.95675,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "San Vicente",
    "city": "Liloan",
    "lat": 10.39909,
    "lon": 123.97368,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Kabataan ng Tayud",
    "city": "Liloan",
    "lat": 10.38201,
    "lon": 123.99649,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Pambarangay ng Catarman",
    "city": "Liloan",
    "lat": 10.38684,
    "lon": 124.01097,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Pambarangay ng Tayud",
    "city": "Liloan",
    "lat": 10.38199,
    "lon": 123.99647,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Santa Cruz",
    "city": "Liloan",
    "lat": 10.41256,
    "lon": 123.96368,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Tabla",
    "city": "Liloan",
    "lat": 10.4504,
    "lon": 123.94023,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Tagaytay",
    "city": "Liloan",
    "lat": 10.36906,
    "lon": 123.99558,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Tayud",
    "city": "Liloan",
    "lat": 10.37821,
    "lon": 123.99404,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Tayud Barangay Disaster Risk Reduction and Management Committee",
    "city": "Liloan",
    "lat": 10.382,
    "lon": 123.99648,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Upper Looc",
    "city": "Liloan",
    "lat": 10.36188,
    "lon": 123.99511,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Yati",
    "city": "Liloan",
    "lat": 10.38973,
    "lon": 123.98138,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Alang-alang",
    "city": "Mandaue City",
    "lat": 10.33168,
    "lon": 123.9459,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Bacayan",
    "city": "Mandaue City",
    "lat": 10.38555,
    "lon": 123.91988,
    "type": "barangay",
    "alt": [
      "Bakayan"
    ]
  },
  {
    "name": "Bakilid",
    "city": "Mandaue City",
    "lat": 10.3367,
    "lon": 123.93423,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Banilad",
    "city": "Mandaue City",
    "lat": 10.34138,
    "lon": 123.91967,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Basak",
    "city": "Mandaue City",
    "lat": 10.35464,
    "lon": 123.95003,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Cabancalan",
    "city": "Mandaue City",
    "lat": 10.351,
    "lon": 123.92416,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Cambaro",
    "city": "Mandaue City",
    "lat": 10.32819,
    "lon": 123.94949,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Canduman",
    "city": "Mandaue City",
    "lat": 10.36771,
    "lon": 123.93356,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Canduman Barangay Hall",
    "city": "Mandaue City",
    "lat": 10.36703,
    "lon": 123.93196,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Capanasan",
    "city": "Mandaue City",
    "lat": 10.38438,
    "lon": 123.92767,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Casili",
    "city": "Mandaue City",
    "lat": 10.37965,
    "lon": 123.93388,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Casili Hills",
    "city": "Mandaue City",
    "lat": 10.37704,
    "lon": 123.93636,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Casuntingan",
    "city": "Mandaue City",
    "lat": 10.3453,
    "lon": 123.93054,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Centro",
    "city": "Mandaue City",
    "lat": 10.32573,
    "lon": 123.9427,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Consuelo Village",
    "city": "Mandaue City",
    "lat": 10.35932,
    "lon": 123.94876,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Cubacub",
    "city": "Mandaue City",
    "lat": 10.37136,
    "lon": 123.94005,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Guizo",
    "city": "Mandaue City",
    "lat": 10.33141,
    "lon": 123.93799,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Ibabao-Estancia",
    "city": "Mandaue City",
    "lat": 10.33505,
    "lon": 123.94477,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Jagobiao",
    "city": "Mandaue City",
    "lat": 10.36689,
    "lon": 123.95193,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Labogon",
    "city": "Mandaue City",
    "lat": 10.35258,
    "lon": 123.95448,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Looc",
    "city": "Mandaue City",
    "lat": 10.32285,
    "lon": 123.94949,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Lower Casili",
    "city": "Mandaue City",
    "lat": 10.37852,
    "lon": 123.93859,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Lupa",
    "city": "Mandaue City",
    "lat": 10.35061,
    "lon": 123.93013,
    "type": "barangay",
    "alt": [
      "Sitio Lupa"
    ]
  },
  {
    "name": "Maguikay",
    "city": "Mandaue City",
    "lat": 10.33976,
    "lon": 123.936,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Maguikay Barangay Disaster Risk Reduction and Management Committee",
    "city": "Mandaue City",
    "lat": 10.34422,
    "lon": 123.93795,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Mantuyong",
    "city": "Mandaue City",
    "lat": 10.32936,
    "lon": 123.94049,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Opao",
    "city": "Mandaue City",
    "lat": 10.32885,
    "lon": 123.95694,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Pagsabungan",
    "city": "Mandaue City",
    "lat": 10.35651,
    "lon": 123.94066,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Paknaan",
    "city": "Mandaue City",
    "lat": 10.34622,
    "lon": 123.96021,
    "type": "barangay",
    "alt": [
      "Pakna-an"
    ]
  },
  {
    "name": "Pilit",
    "city": "Mandaue City",
    "lat": 10.35551,
    "lon": 123.92428,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "San Jose",
    "city": "Mandaue City",
    "lat": 10.36461,
    "lon": 123.9564,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Kabataan ng Maguikay",
    "city": "Mandaue City",
    "lat": 10.3442,
    "lon": 123.93794,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Kabataan ng Paknaan",
    "city": "Mandaue City",
    "lat": 10.34625,
    "lon": 123.96019,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Kabataan ng Tabok",
    "city": "Mandaue City",
    "lat": 10.34711,
    "lon": 123.94655,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Kabataan ng Tingub",
    "city": "Mandaue City",
    "lat": 10.35206,
    "lon": 123.93438,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Pambarangay ng Maguikay",
    "city": "Mandaue City",
    "lat": 10.34423,
    "lon": 123.93796,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Pambarangay ng Paknaan",
    "city": "Mandaue City",
    "lat": 10.34624,
    "lon": 123.9602,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Pambarangay ng Tabok",
    "city": "Mandaue City",
    "lat": 10.34713,
    "lon": 123.9466,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Pambarangay ng Tingub",
    "city": "Mandaue City",
    "lat": 10.35207,
    "lon": 123.93438,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Subangdaku",
    "city": "Mandaue City",
    "lat": 10.32318,
    "lon": 123.92452,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sudlon",
    "city": "Mandaue City",
    "lat": 10.32743,
    "lon": 123.94476,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Tabok",
    "city": "Mandaue City",
    "lat": 10.34866,
    "lon": 123.94393,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Tabok Barangay Disaster Risk Reduction and Management Committee",
    "city": "Mandaue City",
    "lat": 10.34712,
    "lon": 123.94658,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Tawason",
    "city": "Mandaue City",
    "lat": 10.3778,
    "lon": 123.92872,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Tingub",
    "city": "Mandaue City",
    "lat": 10.3545,
    "lon": 123.93538,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Tipolo",
    "city": "Mandaue City",
    "lat": 10.33282,
    "lon": 123.92755,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Umapad",
    "city": "Mandaue City",
    "lat": 10.33441,
    "lon": 123.95439,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Upper Casili",
    "city": "Mandaue City",
    "lat": 10.37954,
    "lon": 123.93442,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Villa Vanesa",
    "city": "Mandaue City",
    "lat": 10.37958,
    "lon": 123.93688,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Cadulawan",
    "city": "Minglanilla",
    "lat": 10.25693,
    "lon": 123.78557,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Calajo-an",
    "city": "Minglanilla",
    "lat": 10.23969,
    "lon": 123.80257,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Camp 7",
    "city": "Minglanilla",
    "lat": 10.32209,
    "lon": 123.77315,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Camp 8",
    "city": "Minglanilla",
    "lat": 10.31083,
    "lon": 123.75488,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Camp 8 Barangay Health Station",
    "city": "Minglanilla",
    "lat": 10.31088,
    "lon": 123.75491,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Cuanos",
    "city": "Minglanilla",
    "lat": 10.28616,
    "lon": 123.79384,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Guindaruhan",
    "city": "Minglanilla",
    "lat": 10.26111,
    "lon": 123.7635,
    "type": "barangay",
    "alt": [
      "Guindarohan"
    ]
  },
  {
    "name": "Guindaruhan Barangay Health Station",
    "city": "Minglanilla",
    "lat": 10.2612,
    "lon": 123.7635,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Linao",
    "city": "Minglanilla",
    "lat": 10.2546,
    "lon": 123.8099,
    "type": "barangay",
    "alt": [
      "Linao-Lipata"
    ]
  },
  {
    "name": "Manduang",
    "city": "Minglanilla",
    "lat": 10.27872,
    "lon": 123.78561,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Pakigne",
    "city": "Minglanilla",
    "lat": 10.25111,
    "lon": 123.80557,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Poblacion Ward Ⅰ",
    "city": "Minglanilla",
    "lat": 10.24456,
    "lon": 123.79796,
    "type": "barangay",
    "alt": [
      "Poblacion 1"
    ]
  },
  {
    "name": "Sangguniang Kabataan ng Camp 8",
    "city": "Minglanilla",
    "lat": 10.31092,
    "lon": 123.75496,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Kabataan ng Guindaruhan",
    "city": "Minglanilla",
    "lat": 10.26115,
    "lon": 123.76353,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Kabataan ng Linao-Lipata",
    "city": "Minglanilla",
    "lat": 10.25457,
    "lon": 123.80982,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Kabataan ng Poblacion Ward Ⅳ",
    "city": "Minglanilla",
    "lat": 10.24661,
    "lon": 123.79409,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Pambarangay ng Camp 8",
    "city": "Minglanilla",
    "lat": 10.31093,
    "lon": 123.75495,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Pambarangay ng Guindaruhan",
    "city": "Minglanilla",
    "lat": 10.26115,
    "lon": 123.76351,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Pambarangay ng Linao-Lipata",
    "city": "Minglanilla",
    "lat": 10.25456,
    "lon": 123.80983,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Pambarangay ng Poblacion Ward Ⅳ",
    "city": "Minglanilla",
    "lat": 10.24661,
    "lon": 123.79409,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Tubod",
    "city": "Minglanilla",
    "lat": 10.26378,
    "lon": 123.79887,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Tulay",
    "city": "Minglanilla",
    "lat": 10.23896,
    "lon": 123.79141,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Tunghaan",
    "city": "Minglanilla",
    "lat": 10.24549,
    "lon": 123.78087,
    "type": "barangay",
    "alt": [
      "Tungha-an"
    ]
  },
  {
    "name": "Tungkil",
    "city": "Minglanilla",
    "lat": 10.24467,
    "lon": 123.81374,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Tungkop",
    "city": "Minglanilla",
    "lat": 10.23274,
    "lon": 123.78516,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Velmiro Heights Subdivision",
    "city": "Minglanilla",
    "lat": 10.24751,
    "lon": 123.78478,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Vito",
    "city": "Minglanilla",
    "lat": 10.25484,
    "lon": 123.79212,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Ward IV",
    "city": "Minglanilla",
    "lat": 10.24656,
    "lon": 123.79412,
    "type": "barangay",
    "alt": [
      "Poblacion Ward Ⅳ",
      "Poblacion Ward IV",
      "Ward 4",
      "Pobacion 4"
    ]
  },
  {
    "name": "Alpaco",
    "city": "Naga City",
    "lat": 10.24206,
    "lon": 123.69424,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Bairan",
    "city": "Naga City",
    "lat": 10.19771,
    "lon": 123.71968,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Balirong",
    "city": "Naga City",
    "lat": 10.2567,
    "lon": 123.71077,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Cabungahan",
    "city": "Naga City",
    "lat": 10.21364,
    "lon": 123.72028,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Caimito",
    "city": "Naga City",
    "lat": 10.28216,
    "lon": 123.70866,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Cantao-an",
    "city": "Naga City",
    "lat": 10.24507,
    "lon": 123.75246,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Central Poblacion",
    "city": "Naga City",
    "lat": 10.20747,
    "lon": 123.75725,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Cogon",
    "city": "Naga City",
    "lat": 10.26864,
    "lon": 123.73999,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Colon",
    "city": "Naga City",
    "lat": 10.21989,
    "lon": 123.76149,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "East Poblacion",
    "city": "Naga City",
    "lat": 10.20987,
    "lon": 123.75943,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Inayagan",
    "city": "Naga City",
    "lat": 10.23645,
    "lon": 123.77452,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Inoburan",
    "city": "Naga City",
    "lat": 10.18891,
    "lon": 123.73974,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Jaguimit",
    "city": "Naga City",
    "lat": 10.22919,
    "lon": 123.70907,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Lanas",
    "city": "Naga City",
    "lat": 10.27244,
    "lon": 123.71701,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Langtad",
    "city": "Naga City",
    "lat": 10.18364,
    "lon": 123.73279,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Lutac",
    "city": "Naga City",
    "lat": 10.24892,
    "lon": 123.72587,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Mainit",
    "city": "Naga City",
    "lat": 10.21694,
    "lon": 123.73136,
    "type": "barangay",
    "alt": [
      "Upper Mainit"
    ]
  },
  {
    "name": "Mayana",
    "city": "Naga City",
    "lat": 10.2888,
    "lon": 123.69489,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Na-alad",
    "city": "Naga City",
    "lat": 10.20954,
    "lon": 123.74429,
    "type": "barangay",
    "alt": [
      "Naalad",
      "Lower Naalad"
    ]
  },
  {
    "name": "North Poblacion",
    "city": "Naga City",
    "lat": 10.21241,
    "lon": 123.75879,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Pangdan",
    "city": "Naga City",
    "lat": 10.23263,
    "lon": 123.72731,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Patag",
    "city": "Naga City",
    "lat": 10.23024,
    "lon": 123.69931,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "South Poblacion",
    "city": "Naga City",
    "lat": 10.20348,
    "lon": 123.75524,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Tagjaguimit",
    "city": "Naga City",
    "lat": 10.26576,
    "lon": 123.68113,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Tangke",
    "city": "Naga City",
    "lat": 10.21611,
    "lon": 123.75353,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Tinaan",
    "city": "Naga City",
    "lat": 10.19356,
    "lon": 123.74513,
    "type": "barangay",
    "alt": [
      "Tinaan"
    ]
  },
  {
    "name": "Tuyan",
    "city": "Naga City",
    "lat": 10.22824,
    "lon": 123.76728,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Uling",
    "city": "Naga City",
    "lat": 10.28019,
    "lon": 123.71152,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Upper Na-alad",
    "city": "Naga City",
    "lat": 10.21881,
    "lon": 123.7427,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "West Poblacion",
    "city": "Naga City",
    "lat": 10.21109,
    "lon": 123.75356,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Balud",
    "city": "San Fernando",
    "lat": 10.14838,
    "lon": 123.69465,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Basak",
    "city": "San Fernando",
    "lat": 10.17843,
    "lon": 123.66576,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Bugho",
    "city": "San Fernando",
    "lat": 10.22487,
    "lon": 123.67174,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Cabatbatan",
    "city": "San Fernando",
    "lat": 10.21642,
    "lon": 123.68575,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Greenhills",
    "city": "San Fernando",
    "lat": 10.13889,
    "lon": 123.67481,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Ilaya",
    "city": "San Fernando",
    "lat": 10.18784,
    "lon": 123.70805,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Lantawan",
    "city": "San Fernando",
    "lat": 10.1695,
    "lon": 123.65366,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Magsico",
    "city": "San Fernando",
    "lat": 10.20425,
    "lon": 123.67811,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "North Poblacion",
    "city": "San Fernando",
    "lat": 10.16502,
    "lon": 123.7077,
    "type": "barangay",
    "alt": [
      "Poblacion North"
    ]
  },
  {
    "name": "Panadtaran",
    "city": "San Fernando",
    "lat": 10.15346,
    "lon": 123.6988,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Pitalo",
    "city": "San Fernando",
    "lat": 10.17644,
    "lon": 123.72166,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "San Isidro",
    "city": "San Fernando",
    "lat": 10.17174,
    "lon": 123.71562,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangat",
    "city": "San Fernando",
    "lat": 10.13325,
    "lon": 123.68772,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Kabataan ng North Poblacion",
    "city": "San Fernando",
    "lat": 10.16504,
    "lon": 123.70777,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Pambarangay ng North Poblacion",
    "city": "San Fernando",
    "lat": 10.16506,
    "lon": 123.70776,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "South Poblacion",
    "city": "San Fernando",
    "lat": 10.16016,
    "lon": 123.70548,
    "type": "barangay",
    "alt": [
      "Poblacion South"
    ]
  },
  {
    "name": "Tabionan",
    "city": "San Fernando",
    "lat": 10.19327,
    "lon": 123.6701,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Tañañas",
    "city": "San Fernando",
    "lat": 10.18306,
    "lon": 123.69908,
    "type": "barangay",
    "alt": [
      "Tananas"
    ]
  },
  {
    "name": "Tinubdan",
    "city": "San Fernando",
    "lat": 10.17589,
    "lon": 123.68376,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Tonggo",
    "city": "San Fernando",
    "lat": 10.16396,
    "lon": 123.68474,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Tubod",
    "city": "San Fernando",
    "lat": 10.21377,
    "lon": 123.65109,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Biasong",
    "city": "Talisay City",
    "lat": 10.23746,
    "lon": 123.82875,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Bulacao",
    "city": "Talisay City",
    "lat": 10.27107,
    "lon": 123.84511,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Camp 4",
    "city": "Talisay City",
    "lat": 10.32056,
    "lon": 123.82035,
    "type": "barangay",
    "alt": [
      "Camp IV"
    ]
  },
  {
    "name": "Candulawan",
    "city": "Talisay City",
    "lat": 10.27887,
    "lon": 123.84348,
    "type": "barangay",
    "alt": [
      "Cadulawan"
    ]
  },
  {
    "name": "Cansojong",
    "city": "Talisay City",
    "lat": 10.24952,
    "lon": 123.85488,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Dumlog",
    "city": "Talisay City",
    "lat": 10.24501,
    "lon": 123.83955,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Jaclupan",
    "city": "Talisay City",
    "lat": 10.30093,
    "lon": 123.81757,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Lagtang",
    "city": "Talisay City",
    "lat": 10.26695,
    "lon": 123.83352,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Laray",
    "city": "Talisay City",
    "lat": 10.25703,
    "lon": 123.86025,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Lawaan I",
    "city": "Talisay City",
    "lat": 10.25825,
    "lon": 123.82305,
    "type": "barangay",
    "alt": [
      "Lawaan 1"
    ]
  },
  {
    "name": "Lawaan II",
    "city": "Talisay City",
    "lat": 10.25356,
    "lon": 123.83214,
    "type": "barangay",
    "alt": [
      "Lawaan 2"
    ]
  },
  {
    "name": "Lawaan III",
    "city": "Talisay City",
    "lat": 10.26539,
    "lon": 123.83153,
    "type": "barangay",
    "alt": [
      "Lawaan 3",
      "Lawa-an 3"
    ]
  },
  {
    "name": "Linao",
    "city": "Talisay City",
    "lat": 10.26231,
    "lon": 123.81816,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Maghaway",
    "city": "Talisay City",
    "lat": 10.27824,
    "lon": 123.81617,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Makulay",
    "city": "Talisay City",
    "lat": 10.24216,
    "lon": 123.83371,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Malipayon",
    "city": "Talisay City",
    "lat": 10.24236,
    "lon": 123.83302,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Manipis",
    "city": "Talisay City",
    "lat": 10.32128,
    "lon": 123.7862,
    "type": "barangay",
    "alt": [
      "Camp 6"
    ]
  },
  {
    "name": "Mohon",
    "city": "Talisay City",
    "lat": 10.24937,
    "lon": 123.82715,
    "type": "barangay",
    "alt": [
      "Mojon"
    ]
  },
  {
    "name": "Pag-laum",
    "city": "Talisay City",
    "lat": 10.26563,
    "lon": 123.84885,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Pangpang",
    "city": "Talisay City",
    "lat": 10.25718,
    "lon": 123.83743,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Pidanna",
    "city": "Talisay City",
    "lat": 10.24227,
    "lon": 123.83092,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Poblacion",
    "city": "Talisay City",
    "lat": 10.24463,
    "lon": 123.84649,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Pooc",
    "city": "Talisay City",
    "lat": 10.23838,
    "lon": 123.82444,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "San Isidro",
    "city": "Talisay City",
    "lat": 10.25989,
    "lon": 123.84037,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "San Isidro Barangay Disaster Risk Reduction and Management Committee",
    "city": "Talisay City",
    "lat": 10.25964,
    "lon": 123.84043,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "San Lucas",
    "city": "Talisay City",
    "lat": 10.24275,
    "lon": 123.83306,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "San Roque",
    "city": "Talisay City",
    "lat": 10.25565,
    "lon": 123.8606,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Kabataan ng Lagtang",
    "city": "Talisay City",
    "lat": 10.26616,
    "lon": 123.83545,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Kabataan ng Lawaan Uno",
    "city": "Talisay City",
    "lat": 10.25853,
    "lon": 123.82157,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Kabataan ng San Isidro",
    "city": "Talisay City",
    "lat": 10.25963,
    "lon": 123.84043,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Pambarangay ng Lagtang",
    "city": "Talisay City",
    "lat": 10.26615,
    "lon": 123.83546,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Pambarangay ng Lawaan Uno",
    "city": "Talisay City",
    "lat": 10.25852,
    "lon": 123.82158,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Sangguniang Pambarangay ng San Isidro",
    "city": "Talisay City",
    "lat": 10.25965,
    "lon": 123.84043,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Selma Crusher",
    "city": "Talisay City",
    "lat": 10.2652,
    "lon": 123.8293,
    "type": "barangay",
    "alt": []
  },
  {
    "name": "Tabunok",
    "city": "Talisay City",
    "lat": 10.26358,
    "lon": 123.83982,
    "type": "barangay",
    "alt": [
      "Tabunoc"
    ]
  },
  {
    "name": "Tangke",
    "city": "Talisay City",
    "lat": 10.25096,
    "lon": 123.86131,
    "type": "barangay",
    "alt": [
      "Tanke"
    ]
  },
  {
    "name": "Tapul",
    "city": "Talisay City",
    "lat": 10.28894,
    "lon": 123.80344,
    "type": "barangay",
    "alt": []
  }
];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s-_.,'’]/g, "")
    .trim();
}

function cleanQuery(text: string): string {
  return text
    .toLowerCase()
    .replace(/^(barangay|brgy\.?)\s+/i, "")
    .replace(/^(city\s+of|municipality\s+of)\s+/i, "")
    .replace(/\s+(city)$/i, "")
    .trim();
}

/**
 * Searches the curated offline Cebu location index.
 * Matches exact names, alternate names, prefixes, cleaned prefixes, and word boundaries.
 */
export function lookupCebuLocation(query: string): CebuLocation | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  const qNorm = normalizeText(q);
  const qClean = cleanQuery(q);
  const qCleanNorm = normalizeText(qClean);
  const qHead = q.split(",")[0].trim().toLowerCase();
  const qHeadNorm = normalizeText(qHead);

  // 1. Exact canonical name match (direct or cleaned)
  const exact = CEBU_LOCATIONS.find((loc) => {
    const locLower = loc.name.toLowerCase();
    const locNorm = normalizeText(loc.name);
    return (
      locLower === q ||
      locNorm === qNorm ||
      locLower === qClean ||
      locNorm === qCleanNorm ||
      locLower === qHead ||
      locNorm === qHeadNorm
    );
  });
  if (exact) return exact;

  // 2. Exact alternate name match
  const exactAlt = CEBU_LOCATIONS.find((loc) => {
    if (!loc.alt) return false;
    return loc.alt.some((a) => {
      const aLower = a.toLowerCase();
      const aNorm = normalizeText(a);
      return (
        aLower === q ||
        aNorm === qNorm ||
        aLower === qClean ||
        aNorm === qCleanNorm ||
        aLower === qHead ||
        aNorm === qHeadNorm
      );
    });
  });
  if (exactAlt) return exactAlt;

  // 3. Word startsWith match (e.g. "Lahug" matching "Brgy. Lahug" or vice versa)
  const prefixMatch = CEBU_LOCATIONS.find((loc) => {
    const locNorm = normalizeText(loc.name);
    return (
      locNorm.startsWith(qNorm) ||
      qNorm.startsWith(locNorm) ||
      locNorm.startsWith(qCleanNorm) ||
      qCleanNorm.startsWith(locNorm)
    );
  });
  if (prefixMatch) return prefixMatch;

  // 4. Substring match for queries >= 4 characters
  if (qCleanNorm.length >= 4) {
    const subMatch = CEBU_LOCATIONS.find((loc) => {
      const locNorm = normalizeText(loc.name);
      return locNorm.includes(qCleanNorm) || qCleanNorm.includes(locNorm);
    });
    if (subMatch) return subMatch;
  }

  return null;
}

export interface GeocodeResult {
  displayName: string;
  lat: number;
  lon: number;
  type: string;
}

/**
 * Tier 3: Cebu-Bounded Public Online Geocoding Fallback.
 * Queries OpenStreetMap Nominatim with strict bounding box to Cebu Province.
 * Respects timeout and fails gracefully if offline or no results found.
 */
export async function geocodeCebuOnline(query: string, timeoutMs = 4000): Promise<GeocodeResult | null> {
  const q = query.trim();
  if (!q) return null;

  // Restrict strictly to Cebu bounding box (approx. 9.3°N to 11.4°N, 123.1°E to 124.4°E)
  const encodedQuery = encodeURIComponent(`${q}, Cebu, Philippines`);
  const url = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&viewbox=123.1,11.4,124.4,9.3&bounded=1&limit=1`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    clearTimeout(timer);
    if (!res.ok) return null;

    const data = (await res.json()) as any[];
    if (!Array.isArray(data) || data.length === 0) return null;

    const first = data[0];
    const lat = parseFloat(first.lat);
    const lon = parseFloat(first.lon);

    // Validate that the returned coordinate is strictly within Cebu
    if (isNaN(lat) || isNaN(lon)) return null;
    if (lat < 9.3 || lat > 11.4 || lon < 123.1 || lon > 124.4) return null;

    return {
      displayName: first.display_name?.split(",")[0] || q,
      lat,
      lon,
      type: first.type || "street",
    };
  } catch (_err) {
    clearTimeout(timer);
    return null;
  }
}
