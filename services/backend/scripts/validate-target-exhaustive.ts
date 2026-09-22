import {
  adultMaintenanceEnergyKcal,
  adolescentMaintenanceEnergyKcal,
  previewPersonalTargets,
  ageInYears,
  type ActivityCategory,
} from "../src/foundation/target-engine.ts";

type Sex = "male" | "female";

function ref(sex: Sex, activity: ActivityCategory, age: number, height: number, weight: number): number {
  if (age === 18) {
    const m: Record<ActivityCategory,[number,number,number,number]> = {
      inactive:[-447.51,3.68,13.01,13.15], low_active:[19.12,3.68,8.62,20.28],
      active:[-388.19,3.68,12.66,20.46], very_active:[-671.75,3.68,15.38,23.25],
    };
    const f: Record<ActivityCategory,[number,number,number,number]> = {
      inactive:[55.59,-22.25,8.43,17.07], low_active:[-297.54,-22.25,12.77,14.73],
      active:[-189.55,-22.25,11.74,18.34], very_active:[-709.59,-22.25,18.22,14.25],
    };
    const [a,b,c,d]=(sex === "male" ? m : f)[activity];
    return Math.round(a+b*age+c*height+d*weight+20);
  }
  const m: Record<ActivityCategory,[number,number,number,number]> = {
    inactive:[753.07,-10.83,6.50,14.10], low_active:[581.47,-10.83,8.30,14.94],
    active:[1004.82,-10.83,6.52,15.91], very_active:[-517.88,-10.83,15.61,19.11],
  };
  const f: Record<ActivityCategory,[number,number,number,number]> = {
    inactive:[584.90,-7.01,5.72,11.71], low_active:[575.77,-7.01,6.60,12.14],
    active:[710.25,-7.01,6.54,12.34], very_active:[511.83,-7.01,9.07,12.56],
  };
  const [a,b,c,d]=(sex === "male" ? m : f)[activity];
  return Math.round(a+b*age+c*height+d*weight);
}

const activities: ActivityCategory[]=["inactive","low_active","active","very_active"];
const activityLabel: Record<ActivityCategory,string>={inactive:"Sedentary",low_active:"Light",active:"Moderate",very_active:"Very active"};
const sexes: Sex[]=["male","female"];
const ages=[18,19,20,25,30,40,50,60,70,80,90];
const heights=[140,150,160,170,180,190,200,215];
const weights=[40,50,60,75,90,110,135,160,200];
const goals=["Lose weight","Maintain weight","Gain muscle","Improve performance"];
let parityCases=0, goalCases=0;
const parityFailures: unknown[]=[];
const goalFailures: unknown[]=[];
let macroWarnings=0;
let floorClamps=0;

for (const sex of sexes) for (const activity of activities) for (const age of ages) for (const height of heights) for (const weight of weights) {
  const expected=ref(sex,activity,age,height,weight);
  const actual=age===18 ? adolescentMaintenanceEnergyKcal(sex,activity,age,height,weight) : adultMaintenanceEnergyKcal(sex,activity,age,height,weight);
  parityCases++;
  if (actual!==expected) parityFailures.push({sex,activity,age,height,weight,expected,actual});
  const dob=`${2026-age}-08-10`;
  for (const goal of goals) {
    const preview=previewPersonalTargets({dateOfBirth:dob,heightCm:height,weightKg:weight,sexForEnergyEstimate:sex==="male"?"Male":"Female",activityLevel:activityLabel[activity],goal,now:new Date("2026-08-10T00:00:00Z")});
    goalCases++;
    const expectedSuggested=goal==="Lose weight" ? Math.max(1000,Math.round((expected-250)/10)*10) : goal==="Gain muscle" ? Math.max(1000,Math.round((expected+200)/10)*10) : Math.max(1000,Math.round(expected/10)*10);
    const multiplier=goal==="Maintain weight"?1.4:1.6;
    const expectedProtein=Math.max(0,Math.round((weight*multiplier)/5)*5);
    if (expectedSuggested===1000) floorClamps++;
    if (!preview.supported || preview.maintenanceEnergyKcal!==expected || preview.suggestedEnergyKcal!==expectedSuggested || preview.proteinG!==expectedProtein || preview.energyRangeKcal===null || preview.energyRangeKcal.minimum>expectedSuggested || preview.energyRangeKcal.maximum<expectedSuggested) {
      goalFailures.push({sex,activity,age,height,weight,goal,expected,expectedSuggested,expectedProtein,preview});
    }
    macroWarnings += preview.notes.filter(n=>n.includes("outside the adult")).length;
  }
}

const invalidCases=[
  {name:"under18", input:{dateOfBirth:"2009-08-10",heightCm:170,weightKg:65,sexForEnergyEstimate:"Male",activityLevel:"Moderate",goal:"Maintain weight"}},
  {name:"missingSex", input:{dateOfBirth:"1996-08-10",heightCm:170,weightKg:65,activityLevel:"Moderate",goal:"Maintain weight"}},
  {name:"zeroHeight", input:{dateOfBirth:"1996-08-10",heightCm:0,weightKg:65,sexForEnergyEstimate:"Male",activityLevel:"Moderate",goal:"Maintain weight"}},
  {name:"zeroWeight", input:{dateOfBirth:"1996-08-10",heightCm:170,weightKg:0,sexForEnergyEstimate:"Male",activityLevel:"Moderate",goal:"Maintain weight"}},
  {name:"invalidDob", input:{dateOfBirth:"2020-02-31",heightCm:170,weightKg:65,sexForEnergyEstimate:"Male",activityLevel:"Moderate",goal:"Maintain weight"}},
] as const;
const invalidResults=invalidCases.map(c=>({name:c.name,supported:previewPersonalTargets({...c.input,now:new Date("2026-08-10T00:00:00Z")}).supported}));
const invalidPassed=invalidResults.every(x=>x.supported===false);
const dobChecks={
  leapValid: ageInYears("2000-02-29",new Date("2026-08-10T00:00:00Z"))===26,
  impossibleRejected: ageInYears("2001-02-29",new Date("2026-08-10T00:00:00Z"))===null,
  futureRejected: ageInYears("2030-01-01",new Date("2026-08-10T00:00:00Z"))===null,
};

const payload={
  validationVersion:"movefuel-target-exhaustive-v6-1",
  generatedAt:new Date().toISOString(),
  domain:{ages,heightsCm:heights,weightsKg:weights,sexes,activities,goals},
  parity:{cases:parityCases,failures:parityFailures.length,examples:parityFailures.slice(0,10)},
  goals:{cases:goalCases,failures:goalFailures.length,examples:goalFailures.slice(0,10),floorClamps,macroReviewWarnings:macroWarnings},
  invalidInputBoundary:{cases:invalidResults,passed:invalidPassed},
  dateBoundary:{...dobChecks,passed:Object.values(dobChecks).every(Boolean)},
  interpretation:"Formula parity validates implementation against an independent transcription. It does not prove that an individual's true energy expenditure equals the equation; NASEM explicitly recommends monitoring weight over time and adjusting.",
};
(payload as any).passed=parityFailures.length===0 && goalFailures.length===0 && invalidPassed && Object.values(dobChecks).every(Boolean);
console.log(JSON.stringify(payload,null,2));
if (!(payload as any).passed) process.exitCode=1;
