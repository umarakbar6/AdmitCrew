-- Fictional acceptance-test data only. Safe to apply repeatedly.
insert into public.leads (id,name,phone,normalized_phone,country,marks,ielts,last_reply,status) values
('lead-ali','Ali Khan','0301 2345678','923012345678','UK','78%','6.5','Today','Active'),
('lead-ayesha','Ayesha Noor','0333 9876543','923339876543','Canada','85%','7.0','Today','Active'),
('lead-hamza','Hamza Iqbal','0346 2223344','923462223344','UK','69%','Not taken yet','4 days ago','Quiet')
on conflict (normalized_phone) do update set name=excluded.name,phone=excluded.phone,country=excluded.country,marks=excluded.marks,ielts=excluded.ielts,last_reply=excluded.last_reply,status=excluded.status;

insert into public.programs (id,university,country,program,fee,deadline,min_marks,min_ielts,documents) values
('UK-MAN-CS','University of Manchester','UK','BSc Computer Science','£32,000','15 Jan 2027','75%','6.5','Passport, transcript, IELTS'),
('UK-LDS-BM','University of Leeds','UK','BSc Business Management','£27,000','31 Jan 2027','70%','6.5','Passport, transcript, IELTS, personal statement'),
('CA-TOR-CS','University of Toronto','Canada','BSc Computer Science','CAD 60,000','15 Jan 2027','80%','6.5','Passport, transcript, IELTS'),
('DE-TUM-INF','TU Munich','Germany','BSc Informatics','No tuition (about €150 a term)','15 Jul 2027','70%','6.5','Passport, transcript, IELTS'),
('AU-MON-IT','Monash University','Australia','Bachelor of IT','AUD 48,000','30 Nov 2026','70%','6.0','Passport, transcript, IELTS'),
('UK-BIR-DS','University of Birmingham','UK','BSc Data Science','£29,500','25 Jan 2027','72%','6.5','Passport, transcript, IELTS, personal statement'),
('UK-GLA-ENG','University of Glasgow','UK','BEng Software Engineering','£30,200','20 Jan 2027','74%','6.5','Passport, transcript, IELTS'),
('UK-SHF-ECON','University of Sheffield','UK','BA Economics','£26,800','31 Jan 2027','70%','6.5','Passport, transcript, IELTS, personal statement'),
('CA-UBC-DS','University of British Columbia','Canada','BSc Data Science','CAD 58,000','15 Jan 2027','82%','6.5','Passport, transcript, IELTS'),
('CA-ALB-ENG','University of Alberta','Canada','BSc Engineering','CAD 45,000','1 Mar 2027','78%','6.5','Passport, transcript, IELTS'),
('CA-WAT-BUS','University of Waterloo','Canada','BA Business','CAD 51,000','1 Feb 2027','80%','6.5','Passport, transcript, IELTS, personal statement'),
('DE-RWTH-CS','RWTH Aachen University','Germany','BSc Computer Science','No tuition (about €320 a term)','15 Jul 2027','72%','6.5','Passport, transcript, IELTS'),
('DE-BER-BUS','Humboldt University Berlin','Germany','BSc Business Administration','No tuition (about €315 a term)','31 May 2027','70%','6.0','Passport, transcript, IELTS'),
('AU-SYD-CS','University of Sydney','Australia','Bachelor of Computer Science','AUD 56,000','1 Dec 2026','75%','6.5','Passport, transcript, IELTS'),
('AU-QUE-BUS','University of Queensland','Australia','Bachelor of Business Management','AUD 50,000','30 Nov 2026','72%','6.5','Passport, transcript, IELTS, personal statement')
on conflict (id) do update set university=excluded.university,country=excluded.country,program=excluded.program,fee=excluded.fee,deadline=excluded.deadline,min_marks=excluded.min_marks,min_ielts=excluded.min_ielts,documents=excluded.documents;

insert into public.approvals (id,lead_id,lead_name,agent,message,reason,status)
values ('ap-ali','lead-ali','Ali Khan','University Agent','University of Manchester — BSc Computer Science costs £32,000 per year. The deadline is 15 Jan 2027. Minimum requirements are 75% marks and IELTS 6.5. Required documents: Passport, transcript, IELTS.','Approved record UK-MAN-CS','pending')
on conflict (id) do nothing;

insert into public.audit_log (id,actor_id,actor_name,action,detail,tone)
values ('seed-lead-match','system','Intake Agent','Lead matched','Ali Khan matched by normalized phone 923012345678.','blue')
on conflict (id) do nothing;
