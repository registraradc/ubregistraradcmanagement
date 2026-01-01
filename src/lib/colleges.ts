export interface College {
  name: string;
  abbreviation: string;
  programs: string[];
}

export const colleges: College[] = [
  {
    name: "College of Law",
    abbreviation: "COL",
    programs: [
      "Juris Doctor",
      "Master of Legal Studies"
    ]
  },
  {
    name: "College of Business and Accountancy",
    abbreviation: "CBA",
    programs: [
      "Bachelor of Science in Accountancy",
      "Bachelor of Science in Business Administration major in Marketing Management",
      "Bachelor of Science in Business Administration major in Financial Management",
      "Bachelor of Science in Business Administration major in Operations Management",
      "Bachelor of Science in Business Administration major in Human Resource Development Management"
    ]
  },
  {
    name: "College of Engineering, Technology, Architecture, and Fine Arts",
    abbreviation: "CETAFA",
    programs: [
      "Bachelor of Science in Civil Engineering – Structural",
      "Bachelor of Science in Civil Engineering – Water Resources",
      "Bachelor of Science in Geodetic Engineering",
      "Bachelor of Science in Electronics Engineering",
      "Bachelor of Science in Electrical Engineering",
      "Bachelor of Science in Industrial Engineering",
      "Bachelor of Science in Mechanical Engineering",
      "Bachelor of Science in Computer Engineering",
      "Bachelor of Science in Computer Science",
      "Bachelor of Science in Aircraft Maintenance Technology",
      "Associate in Aircraft Maintenance Technology"
    ]
  },
  {
    name: "College of Arts, Sciences, and Education",
    abbreviation: "CASE",
    programs: [
      "Bachelor of Science in Psychology",
      "Bachelor of Arts in English Language Studies",
      "Bachelor of Arts in Political Science",
      "Bachelor of Arts in Philosophy",
      "Bachelor of Secondary Education major in English",
      "Bachelor of Secondary Education major in Filipino",
      "Bachelor of Secondary Education major in Mathematics",
      "Bachelor of Secondary Education major in Social Studies",
      "Bachelor of Secondary Education major in Science",
      "Bachelor of Elementary Education",
      "Bachelor of Early Childhood Education",
      "Bachelor of Special Needs Education",
      "Bachelor of Physical Education",
      "Bachelor of Culture and Arts Education"
    ]
  },
  {
    name: "College of Criminal Justice",
    abbreviation: "CCJ",
    programs: [
      "Bachelor of Science in Criminology"
    ]
  },
  {
    name: "College of Hospitality Management, Tourism, and Nutrition",
    abbreviation: "CHMTN",
    programs: [
      "Bachelor of Science in Hospitality Management",
      "Bachelor of Science in Tourism Management",
      "Bachelor of Science in Nutrition and Dietetics"
    ]
  },
  {
    name: "College of Allied Health Sciences",
    abbreviation: "CAHS",
    programs: [
      "Bachelor of Science in Nursing",
      "Bachelor of Science in Midwifery"
    ]
  },
  {
    name: "College of Physical Therapy and Occupational Therapy",
    abbreviation: "CPTOT",
    programs: [
      "Bachelor of Science in Physical Therapy",
      "Bachelor of Science in Occupational Therapy"
    ]
  },
  {
    name: "College of Pharmacy",
    abbreviation: "COP",
    programs: [
      "Bachelor of Science in Pharmacy"
    ]
  }
];

export const getCollegeByName = (name: string): College | undefined => {
  return colleges.find(c => c.name === name || c.abbreviation === name);
};

export const getProgramsByCollege = (collegeName: string): string[] => {
  const college = getCollegeByName(collegeName);
  return college?.programs || [];
};
