export type Lead={id:string;name:string;phone:string;normalizedPhone:string;country:string;marks:string;ielts:string;lastReply:string;status:string};
export type Program={id:string;university:string;country:string;program:string;fee:string;deadline:string;minMarks:string;minIelts:string;documents:string};
export const INITIAL_LEADS:Lead[]=[
 {id:"lead-ali",name:"Ali Khan",phone:"0301 2345678",normalizedPhone:"923012345678",country:"UK",marks:"78%",ielts:"6.5",lastReply:"Today",status:"Active"},
 {id:"lead-ayesha",name:"Ayesha Noor",phone:"0333 9876543",normalizedPhone:"923339876543",country:"Canada",marks:"85%",ielts:"7.0",lastReply:"Today",status:"Active"},
 {id:"lead-hamza",name:"Hamza Iqbal",phone:"0346 2223344",normalizedPhone:"923462223344",country:"UK",marks:"69%",ielts:"Not taken yet",lastReply:"4 days ago",status:"Quiet"},
];
export const PROGRAMS:Program[]=[
 {id:"UK-MAN-CS",university:"University of Manchester",country:"UK",program:"BSc Computer Science",fee:"£32,000",deadline:"15 Jan 2027",minMarks:"75%",minIelts:"6.5",documents:"Passport, transcript, IELTS"},
 {id:"UK-LDS-BM",university:"University of Leeds",country:"UK",program:"BSc Business Management",fee:"£27,000",deadline:"31 Jan 2027",minMarks:"70%",minIelts:"6.5",documents:"Passport, transcript, IELTS, personal statement"},
 {id:"CA-TOR-CS",university:"University of Toronto",country:"Canada",program:"BSc Computer Science",fee:"CAD 60,000",deadline:"15 Jan 2027",minMarks:"80%",minIelts:"6.5",documents:"Passport, transcript, IELTS"},
 {id:"DE-TUM-INF",university:"TU Munich",country:"Germany",program:"BSc Informatics",fee:"No tuition (about €150 a term)",deadline:"15 Jul 2027",minMarks:"70%",minIelts:"6.5",documents:"Passport, transcript, IELTS"},
 {id:"AU-MON-IT",university:"Monash University",country:"Australia",program:"Bachelor of IT",fee:"AUD 48,000",deadline:"30 Nov 2026",minMarks:"70%",minIelts:"6.0",documents:"Passport, transcript, IELTS"},
 {id:"UK-BIR-DS",university:"University of Birmingham",country:"UK",program:"BSc Data Science",fee:"£29,500",deadline:"25 Jan 2027",minMarks:"72%",minIelts:"6.5",documents:"Passport, transcript, IELTS, personal statement"},
 {id:"UK-GLA-ENG",university:"University of Glasgow",country:"UK",program:"BEng Software Engineering",fee:"£30,200",deadline:"20 Jan 2027",minMarks:"74%",minIelts:"6.5",documents:"Passport, transcript, IELTS"},
 {id:"UK-SHF-ECON",university:"University of Sheffield",country:"UK",program:"BA Economics",fee:"£26,800",deadline:"31 Jan 2027",minMarks:"70%",minIelts:"6.5",documents:"Passport, transcript, IELTS, personal statement"},
 {id:"CA-UBC-DS",university:"University of British Columbia",country:"Canada",program:"BSc Data Science",fee:"CAD 58,000",deadline:"15 Jan 2027",minMarks:"82%",minIelts:"6.5",documents:"Passport, transcript, IELTS"},
 {id:"CA-ALB-ENG",university:"University of Alberta",country:"Canada",program:"BSc Engineering",fee:"CAD 45,000",deadline:"1 Mar 2027",minMarks:"78%",minIelts:"6.5",documents:"Passport, transcript, IELTS"},
 {id:"CA-WAT-BUS",university:"University of Waterloo",country:"Canada",program:"BA Business",fee:"CAD 51,000",deadline:"1 Feb 2027",minMarks:"80%",minIelts:"6.5",documents:"Passport, transcript, IELTS, personal statement"},
 {id:"DE-RWTH-CS",university:"RWTH Aachen University",country:"Germany",program:"BSc Computer Science",fee:"No tuition (about €320 a term)",deadline:"15 Jul 2027",minMarks:"72%",minIelts:"6.5",documents:"Passport, transcript, IELTS"},
 {id:"DE-BER-BUS",university:"Humboldt University Berlin",country:"Germany",program:"BSc Business Administration",fee:"No tuition (about €315 a term)",deadline:"31 May 2027",minMarks:"70%",minIelts:"6.0",documents:"Passport, transcript, IELTS"},
 {id:"AU-SYD-CS",university:"University of Sydney",country:"Australia",program:"Bachelor of Computer Science",fee:"AUD 56,000",deadline:"1 Dec 2026",minMarks:"75%",minIelts:"6.5",documents:"Passport, transcript, IELTS"},
 {id:"AU-QUE-BUS",university:"University of Queensland",country:"Australia",program:"Bachelor of Business Management",fee:"AUD 50,000",deadline:"30 Nov 2026",minMarks:"72%",minIelts:"6.5",documents:"Passport, transcript, IELTS, personal statement"},
];
