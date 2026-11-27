import type { Infer } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation } from "./_generated/server";
import type { WeeklyHours } from "./lib/hours";
import { ensureSlugs } from "./lib/slugs";
import type { optionGroup } from "./schema";

const h = (hour: number) => hour * 60;
const everyDay = (open: number, close: number, closedDays: number[] = []): WeeklyHours =>
  [0, 1, 2, 3, 4, 5, 6]
    .filter((day) => !closedDays.includes(day))
    .map((day) => ({ day, open, close }));

const FRIDAY = 5;

const zones = [
  { name: "بركة السبع", kind: "city", deliveryFee: 15, polygon: [{ lat: 30.66198, lng: 31.083 }, { lat: 30.659925, lng: 31.095003 }, { lat: 30.654076, lng: 31.105176 }, { lat: 30.645321, lng: 31.111972 }, { lat: 30.634996, lng: 31.114356 }, { lat: 30.624672, lng: 31.111966 }, { lat: 30.615921, lng: 31.105168 }, { lat: 30.610074, lng: 31.094996 }, { lat: 30.60802, lng: 31.083 }, { lat: 30.610074, lng: 31.071004 }, { lat: 30.615921, lng: 31.060832 }, { lat: 30.624672, lng: 31.054034 }, { lat: 30.634996, lng: 31.051644 }, { lat: 30.645321, lng: 31.054028 }, { lat: 30.654076, lng: 31.060824 }, { lat: 30.659925, lng: 31.070997 }] },
  { name: "كفر عليم", kind: "village", deliveryFee: 30, polygon: [{ lat: 30.623591, lng: 31.055 }, { lat: 30.622632, lng: 31.060599 }, { lat: 30.619902, lng: 31.065345 }, { lat: 30.615817, lng: 31.068516 }, { lat: 30.610999, lng: 31.069629 }, { lat: 30.606181, lng: 31.068515 }, { lat: 30.602097, lng: 31.065343 }, { lat: 30.599368, lng: 31.060598 }, { lat: 30.598409, lng: 31.055 }, { lat: 30.599368, lng: 31.049402 }, { lat: 30.602097, lng: 31.044657 }, { lat: 30.606181, lng: 31.041485 }, { lat: 30.610999, lng: 31.040371 }, { lat: 30.615817, lng: 31.041484 }, { lat: 30.619902, lng: 31.044655 }, { lat: 30.622632, lng: 31.049401 }] },
  { name: "الروضة", kind: "village", deliveryFee: 35, polygon: [{ lat: 30.669691, lng: 31.095 }, { lat: 30.668801, lng: 31.100202 }, { lat: 30.666267, lng: 31.104611 }, { lat: 30.662473, lng: 31.107557 }, { lat: 30.657999, lng: 31.108591 }, { lat: 30.653525, lng: 31.107556 }, { lat: 30.649733, lng: 31.104609 }, { lat: 30.647199, lng: 31.1002 }, { lat: 30.646309, lng: 31.095 }, { lat: 30.647199, lng: 31.0898 }, { lat: 30.649733, lng: 31.085391 }, { lat: 30.653525, lng: 31.082444 }, { lat: 30.657999, lng: 31.081409 }, { lat: 30.662473, lng: 31.082443 }, { lat: 30.666267, lng: 31.085389 }, { lat: 30.668801, lng: 31.089798 }] },
  { name: "الغوري", kind: "village", deliveryFee: 35, polygon: [{ lat: 30.631691, lng: 31.05 }, { lat: 30.630801, lng: 31.0552 }, { lat: 30.628267, lng: 31.059607 }, { lat: 30.624473, lng: 31.062552 }, { lat: 30.619999, lng: 31.063585 }, { lat: 30.615525, lng: 31.062551 }, { lat: 30.611733, lng: 31.059606 }, { lat: 30.609199, lng: 31.055198 }, { lat: 30.608309, lng: 31.05 }, { lat: 30.609199, lng: 31.044802 }, { lat: 30.611733, lng: 31.040394 }, { lat: 30.615525, lng: 31.037449 }, { lat: 30.619999, lng: 31.036415 }, { lat: 30.624473, lng: 31.037448 }, { lat: 30.628267, lng: 31.040393 }, { lat: 30.630801, lng: 31.0448 }] },
  { name: "شنتنا الحجر", kind: "village", deliveryFee: 35, polygon: [{ lat: 30.654389, lng: 31.12 }, { lat: 30.653294, lng: 31.126401 }, { lat: 30.650174, lng: 31.131827 }, { lat: 30.645506, lng: 31.135452 }, { lat: 30.639999, lng: 31.136724 }, { lat: 30.634493, lng: 31.13545 }, { lat: 30.629825, lng: 31.131824 }, { lat: 30.626706, lng: 31.126399 }, { lat: 30.625611, lng: 31.12 }, { lat: 30.626706, lng: 31.113601 }, { lat: 30.629825, lng: 31.108176 }, { lat: 30.634493, lng: 31.10455 }, { lat: 30.639999, lng: 31.103276 }, { lat: 30.645506, lng: 31.104548 }, { lat: 30.650174, lng: 31.108173 }, { lat: 30.653294, lng: 31.113599 }] },
  { name: "الشهيد فكري", kind: "village", deliveryFee: 40, polygon: [{ lat: 30.663691, lng: 31.07 }, { lat: 30.662801, lng: 31.075201 }, { lat: 30.660267, lng: 31.07961 }, { lat: 30.656473, lng: 31.082556 }, { lat: 30.651999, lng: 31.08359 }, { lat: 30.647525, lng: 31.082555 }, { lat: 30.643733, lng: 31.079609 }, { lat: 30.641199, lng: 31.0752 }, { lat: 30.640309, lng: 31.07 }, { lat: 30.641199, lng: 31.0648 }, { lat: 30.643733, lng: 31.060391 }, { lat: 30.647525, lng: 31.057445 }, { lat: 30.651999, lng: 31.05641 }, { lat: 30.656473, lng: 31.057444 }, { lat: 30.660267, lng: 31.06039 }, { lat: 30.662801, lng: 31.064799 }] },
  { name: "هورين", kind: "village", deliveryFee: 40, polygon: [{ lat: 30.681691, lng: 31.06 }, { lat: 30.680801, lng: 31.065202 }, { lat: 30.678267, lng: 31.069612 }, { lat: 30.674473, lng: 31.072558 }, { lat: 30.669999, lng: 31.073593 }, { lat: 30.665525, lng: 31.072557 }, { lat: 30.661733, lng: 31.069611 }, { lat: 30.659199, lng: 31.065201 }, { lat: 30.658309, lng: 31.06 }, { lat: 30.659199, lng: 31.054799 }, { lat: 30.661733, lng: 31.050389 }, { lat: 30.665525, lng: 31.047443 }, { lat: 30.669999, lng: 31.046407 }, { lat: 30.674473, lng: 31.047442 }, { lat: 30.678267, lng: 31.050388 }, { lat: 30.680801, lng: 31.054798 }] },
  { name: "طوخ طنبشا", kind: "village", deliveryFee: 40, polygon: [{ lat: 30.629389, lng: 31.11 }, { lat: 30.628294, lng: 31.116399 }, { lat: 30.625174, lng: 31.121824 }, { lat: 30.620506, lng: 31.125448 }, { lat: 30.614999, lng: 31.12672 }, { lat: 30.609493, lng: 31.125446 }, { lat: 30.604825, lng: 31.121821 }, { lat: 30.601706, lng: 31.116397 }, { lat: 30.600611, lng: 31.11 }, { lat: 30.601706, lng: 31.103603 }, { lat: 30.604825, lng: 31.098179 }, { lat: 30.609493, lng: 31.094554 }, { lat: 30.614999, lng: 31.09328 }, { lat: 30.620506, lng: 31.094552 }, { lat: 30.625174, lng: 31.098176 }, { lat: 30.628294, lng: 31.103601 }] },
  { name: "عزبة راتب", kind: "village", deliveryFee: 40, polygon: [{ lat: 30.636691, lng: 31.13 }, { lat: 30.635801, lng: 31.1352 }, { lat: 30.633267, lng: 31.139608 }, { lat: 30.629473, lng: 31.142553 }, { lat: 30.624999, lng: 31.143586 }, { lat: 30.620525, lng: 31.142551 }, { lat: 30.616733, lng: 31.139606 }, { lat: 30.614199, lng: 31.135199 }, { lat: 30.613309, lng: 31.13 }, { lat: 30.614199, lng: 31.124801 }, { lat: 30.616733, lng: 31.120394 }, { lat: 30.620525, lng: 31.117449 }, { lat: 30.624999, lng: 31.116414 }, { lat: 30.629473, lng: 31.117447 }, { lat: 30.633267, lng: 31.120392 }, { lat: 30.635801, lng: 31.1248 }] },
  { name: "كفر هورين", kind: "village", deliveryFee: 40, polygon: [{ lat: 30.689691, lng: 31.052 }, { lat: 30.688801, lng: 31.057203 }, { lat: 30.686267, lng: 31.061613 }, { lat: 30.682473, lng: 31.064559 }, { lat: 30.677999, lng: 31.065594 }, { lat: 30.673525, lng: 31.064558 }, { lat: 30.669733, lng: 31.061611 }, { lat: 30.667199, lng: 31.057201 }, { lat: 30.666309, lng: 31.052 }, { lat: 30.667199, lng: 31.046799 }, { lat: 30.669733, lng: 31.042389 }, { lat: 30.673525, lng: 31.039442 }, { lat: 30.677999, lng: 31.038406 }, { lat: 30.682473, lng: 31.039441 }, { lat: 30.686267, lng: 31.042387 }, { lat: 30.688801, lng: 31.046797 }] },
  { name: "طنبشا", kind: "village", deliveryFee: 45, polygon: [{ lat: 30.62149, lng: 31.098 }, { lat: 30.620463, lng: 31.103999 }, { lat: 30.617538, lng: 31.109084 }, { lat: 30.613162, lng: 31.112481 }, { lat: 30.607999, lng: 31.113674 }, { lat: 30.602837, lng: 31.11248 }, { lat: 30.598461, lng: 31.109082 }, { lat: 30.595537, lng: 31.103997 }, { lat: 30.59451, lng: 31.098 }, { lat: 30.595537, lng: 31.092003 }, { lat: 30.598461, lng: 31.086918 }, { lat: 30.602837, lng: 31.08352 }, { lat: 30.607999, lng: 31.082326 }, { lat: 30.613162, lng: 31.083519 }, { lat: 30.617538, lng: 31.086916 }, { lat: 30.620463, lng: 31.092001 }] },
  { name: "الدبابيبة", kind: "village", deliveryFee: 45, polygon: [{ lat: 30.656691, lng: 31.045 }, { lat: 30.655801, lng: 31.050201 }, { lat: 30.653267, lng: 31.05461 }, { lat: 30.649473, lng: 31.057555 }, { lat: 30.644999, lng: 31.058589 }, { lat: 30.640525, lng: 31.057554 }, { lat: 30.636733, lng: 31.054608 }, { lat: 30.634199, lng: 31.0502 }, { lat: 30.633309, lng: 31.045 }, { lat: 30.634199, lng: 31.0398 }, { lat: 30.636733, lng: 31.035392 }, { lat: 30.640525, lng: 31.032446 }, { lat: 30.644999, lng: 31.031411 }, { lat: 30.649473, lng: 31.032445 }, { lat: 30.653267, lng: 31.03539 }, { lat: 30.655801, lng: 31.039799 }] },
  { name: "كفر الحمادية", kind: "village", deliveryFee: 45, polygon: [{ lat: 30.607591, lng: 31.075 }, { lat: 30.606632, lng: 31.080598 }, { lat: 30.603902, lng: 31.085344 }, { lat: 30.599817, lng: 31.088514 }, { lat: 30.594999, lng: 31.089627 }, { lat: 30.590181, lng: 31.088513 }, { lat: 30.586097, lng: 31.085342 }, { lat: 30.583368, lng: 31.080597 }, { lat: 30.582409, lng: 31.075 }, { lat: 30.583368, lng: 31.069403 }, { lat: 30.586097, lng: 31.064658 }, { lat: 30.590181, lng: 31.061487 }, { lat: 30.594999, lng: 31.060373 }, { lat: 30.599817, lng: 31.061486 }, { lat: 30.603902, lng: 31.064656 }, { lat: 30.606632, lng: 31.069402 }] },
  { name: "ميت أم صالح", kind: "village", deliveryFee: 45, polygon: [{ lat: 30.61349, lng: 31.12 }, { lat: 30.612463, lng: 31.125998 }, { lat: 30.609538, lng: 31.131083 }, { lat: 30.605162, lng: 31.13448 }, { lat: 30.599999, lng: 31.135672 }, { lat: 30.594837, lng: 31.134479 }, { lat: 30.590461, lng: 31.131081 }, { lat: 30.587537, lng: 31.125997 }, { lat: 30.58651, lng: 31.12 }, { lat: 30.587537, lng: 31.114003 }, { lat: 30.590461, lng: 31.108919 }, { lat: 30.594837, lng: 31.105521 }, { lat: 30.599999, lng: 31.104328 }, { lat: 30.605162, lng: 31.10552 }, { lat: 30.609538, lng: 31.108917 }, { lat: 30.612463, lng: 31.114002 }] },
  { name: "ميت فارس", kind: "village", deliveryFee: 45, polygon: [{ lat: 30.677591, lng: 31.115 }, { lat: 30.676632, lng: 31.120602 }, { lat: 30.673902, lng: 31.125351 }, { lat: 30.669817, lng: 31.128524 }, { lat: 30.664999, lng: 31.129637 }, { lat: 30.660181, lng: 31.128522 }, { lat: 30.656097, lng: 31.125349 }, { lat: 30.653368, lng: 31.120601 }, { lat: 30.652409, lng: 31.115 }, { lat: 30.653368, lng: 31.109399 }, { lat: 30.656097, lng: 31.104651 }, { lat: 30.660181, lng: 31.101478 }, { lat: 30.664999, lng: 31.100363 }, { lat: 30.669817, lng: 31.101476 }, { lat: 30.673902, lng: 31.104649 }, { lat: 30.676632, lng: 31.109398 }] },
  { name: "الحلامشة", kind: "village", deliveryFee: 50, polygon: [{ lat: 30.596691, lng: 31.095 }, { lat: 30.595801, lng: 31.100198 }, { lat: 30.593267, lng: 31.104604 }, { lat: 30.589473, lng: 31.107547 }, { lat: 30.584999, lng: 31.108581 }, { lat: 30.580525, lng: 31.107546 }, { lat: 30.576733, lng: 31.104602 }, { lat: 30.574199, lng: 31.100196 }, { lat: 30.573309, lng: 31.095 }, { lat: 30.574199, lng: 31.089804 }, { lat: 30.576733, lng: 31.085398 }, { lat: 30.580525, lng: 31.082454 }, { lat: 30.584999, lng: 31.081419 }, { lat: 30.589473, lng: 31.082453 }, { lat: 30.593267, lng: 31.085396 }, { lat: 30.595801, lng: 31.089802 }] },
  { name: "الحاج داود", kind: "village", deliveryFee: 50, polygon: [{ lat: 30.601691, lng: 31.055 }, { lat: 30.600801, lng: 31.060198 }, { lat: 30.598267, lng: 31.064604 }, { lat: 30.594473, lng: 31.067548 }, { lat: 30.589999, lng: 31.068581 }, { lat: 30.585525, lng: 31.067547 }, { lat: 30.581733, lng: 31.064603 }, { lat: 30.579199, lng: 31.060197 }, { lat: 30.578309, lng: 31.055 }, { lat: 30.579199, lng: 31.049803 }, { lat: 30.581733, lng: 31.045397 }, { lat: 30.585525, lng: 31.042453 }, { lat: 30.589999, lng: 31.041419 }, { lat: 30.594473, lng: 31.042452 }, { lat: 30.598267, lng: 31.045396 }, { lat: 30.600801, lng: 31.049802 }] },
  { name: "جنزور", kind: "village", deliveryFee: 50, polygon: [{ lat: 30.704389, lng: 31.09 }, { lat: 30.703294, lng: 31.096404 }, { lat: 30.700174, lng: 31.101833 }, { lat: 30.695506, lng: 31.10546 }, { lat: 30.689999, lng: 31.106733 }, { lat: 30.684493, lng: 31.105458 }, { lat: 30.679825, lng: 31.101831 }, { lat: 30.676706, lng: 31.096402 }, { lat: 30.675611, lng: 31.09 }, { lat: 30.676706, lng: 31.083598 }, { lat: 30.679825, lng: 31.078169 }, { lat: 30.684493, lng: 31.074542 }, { lat: 30.689999, lng: 31.073267 }, { lat: 30.695506, lng: 31.07454 }, { lat: 30.700174, lng: 31.078167 }, { lat: 30.703294, lng: 31.083596 }] },
  { name: "أبو مشهور", kind: "village", deliveryFee: 50, polygon: [{ lat: 30.587591, lng: 31.11 }, { lat: 30.586632, lng: 31.115597 }, { lat: 30.583902, lng: 31.120341 }, { lat: 30.579817, lng: 31.123511 }, { lat: 30.574999, lng: 31.124624 }, { lat: 30.570181, lng: 31.12351 }, { lat: 30.566097, lng: 31.12034 }, { lat: 30.563368, lng: 31.115596 }, { lat: 30.562409, lng: 31.11 }, { lat: 30.563368, lng: 31.104404 }, { lat: 30.566097, lng: 31.09966 }, { lat: 30.570181, lng: 31.09649 }, { lat: 30.574999, lng: 31.095376 }, { lat: 30.579817, lng: 31.096489 }, { lat: 30.583902, lng: 31.099659 }, { lat: 30.586632, lng: 31.104403 }] },
  { name: "كفر مليج", kind: "village", deliveryFee: 50, polygon: [{ lat: 30.586691, lng: 31.065 }, { lat: 30.585801, lng: 31.070197 }, { lat: 30.583267, lng: 31.074603 }, { lat: 30.579473, lng: 31.077546 }, { lat: 30.574999, lng: 31.078579 }, { lat: 30.570525, lng: 31.077545 }, { lat: 30.566733, lng: 31.074601 }, { lat: 30.564199, lng: 31.070196 }, { lat: 30.563309, lng: 31.065 }, { lat: 30.564199, lng: 31.059804 }, { lat: 30.566733, lng: 31.055399 }, { lat: 30.570525, lng: 31.052455 }, { lat: 30.574999, lng: 31.051421 }, { lat: 30.579473, lng: 31.052454 }, { lat: 30.583267, lng: 31.055397 }, { lat: 30.585801, lng: 31.059803 }] },
  { name: "مليج", kind: "village", deliveryFee: 50, polygon: [{ lat: 30.58349, lng: 31.06 }, { lat: 30.582463, lng: 31.065996 }, { lat: 30.579538, lng: 31.07108 }, { lat: 30.575162, lng: 31.074476 }, { lat: 30.569999, lng: 31.075667 }, { lat: 30.564837, lng: 31.074474 }, { lat: 30.560461, lng: 31.071077 }, { lat: 30.557537, lng: 31.065995 }, { lat: 30.55651, lng: 31.06 }, { lat: 30.557537, lng: 31.054005 }, { lat: 30.560461, lng: 31.048923 }, { lat: 30.564837, lng: 31.045526 }, { lat: 30.569999, lng: 31.044333 }, { lat: 30.575162, lng: 31.045524 }, { lat: 30.579538, lng: 31.04892 }, { lat: 30.582463, lng: 31.054004 }] },
  { name: "كفر نفرة", kind: "village", deliveryFee: 60, polygon: [{ lat: 30.719389, lng: 31.07 }, { lat: 30.718294, lng: 31.076405 }, { lat: 30.715174, lng: 31.081835 }, { lat: 30.710506, lng: 31.085462 }, { lat: 30.704999, lng: 31.086735 }, { lat: 30.699493, lng: 31.085461 }, { lat: 30.694825, lng: 31.081832 }, { lat: 30.691706, lng: 31.076403 }, { lat: 30.690611, lng: 31.07 }, { lat: 30.691706, lng: 31.063597 }, { lat: 30.694825, lng: 31.058168 }, { lat: 30.699493, lng: 31.054539 }, { lat: 30.704999, lng: 31.053265 }, { lat: 30.710506, lng: 31.054538 }, { lat: 30.715174, lng: 31.058165 }, { lat: 30.718294, lng: 31.063595 }] },
  { name: "الرمالي", kind: "village", deliveryFee: 80, polygon: [{ lat: 30.574389, lng: 31.04 }, { lat: 30.573294, lng: 31.046396 }, { lat: 30.570174, lng: 31.051817 }, { lat: 30.565506, lng: 31.055439 }, { lat: 30.559999, lng: 31.05671 }, { lat: 30.554493, lng: 31.055437 }, { lat: 30.549825, lng: 31.051815 }, { lat: 30.546706, lng: 31.046394 }, { lat: 30.545611, lng: 31.04 }, { lat: 30.546706, lng: 31.033606 }, { lat: 30.549825, lng: 31.028185 }, { lat: 30.554493, lng: 31.024563 }, { lat: 30.559999, lng: 31.02329 }, { lat: 30.565506, lng: 31.024561 }, { lat: 30.570174, lng: 31.028183 }, { lat: 30.573294, lng: 31.033604 }] },
  { name: "الجعفرية", kind: "village", deliveryFee: 85, polygon: [{ lat: 30.556188, lng: 31.09 }, { lat: 30.554955, lng: 31.097194 }, { lat: 30.551446, lng: 31.103292 }, { lat: 30.546194, lng: 31.107366 }, { lat: 30.539999, lng: 31.108795 }, { lat: 30.533804, lng: 31.107363 }, { lat: 30.528553, lng: 31.103289 }, { lat: 30.525044, lng: 31.097191 }, { lat: 30.523812, lng: 31.09 }, { lat: 30.525044, lng: 31.082809 }, { lat: 30.528553, lng: 31.076711 }, { lat: 30.533804, lng: 31.072637 }, { lat: 30.539999, lng: 31.071205 }, { lat: 30.546194, lng: 31.072634 }, { lat: 30.551446, lng: 31.076708 }, { lat: 30.554955, lng: 31.082806 }] },
  { name: "مصطاي", kind: "village", deliveryFee: 85, polygon: [{ lat: 30.561188, lng: 31.13 }, { lat: 30.559955, lng: 31.137194 }, { lat: 30.556446, lng: 31.143292 }, { lat: 30.551194, lng: 31.147366 }, { lat: 30.544999, lng: 31.148796 }, { lat: 30.538804, lng: 31.147364 }, { lat: 30.533553, lng: 31.143289 }, { lat: 30.530044, lng: 31.137192 }, { lat: 30.528812, lng: 31.13 }, { lat: 30.530044, lng: 31.122808 }, { lat: 30.533553, lng: 31.116711 }, { lat: 30.538804, lng: 31.112636 }, { lat: 30.544999, lng: 31.111204 }, { lat: 30.551194, lng: 31.112634 }, { lat: 30.556446, lng: 31.116708 }, { lat: 30.559955, lng: 31.122806 }] },
  { name: "كفر هلال", kind: "village", deliveryFee: 90, polygon: [{ lat: 30.736188, lng: 31.04 }, { lat: 30.734955, lng: 31.047207 }, { lat: 30.731446, lng: 31.053317 }, { lat: 30.726194, lng: 31.057398 }, { lat: 30.719999, lng: 31.05883 }, { lat: 30.713804, lng: 31.057396 }, { lat: 30.708553, lng: 31.053313 }, { lat: 30.705044, lng: 31.047205 }, { lat: 30.703812, lng: 31.04 }, { lat: 30.705044, lng: 31.032795 }, { lat: 30.708553, lng: 31.026687 }, { lat: 30.713804, lng: 31.022604 }, { lat: 30.719999, lng: 31.02117 }, { lat: 30.726194, lng: 31.022602 }, { lat: 30.731446, lng: 31.026683 }, { lat: 30.734955, lng: 31.032793 }] },
  { name: "حنون", kind: "village", deliveryFee: 90, polygon: [{ lat: 30.726188, lng: 31.11 }, { lat: 30.724955, lng: 31.117206 }, { lat: 30.721446, lng: 31.123315 }, { lat: 30.716194, lng: 31.127396 }, { lat: 30.709999, lng: 31.128828 }, { lat: 30.703804, lng: 31.127394 }, { lat: 30.698553, lng: 31.123312 }, { lat: 30.695044, lng: 31.117204 }, { lat: 30.693812, lng: 31.11 }, { lat: 30.695044, lng: 31.102796 }, { lat: 30.698553, lng: 31.096688 }, { lat: 30.703804, lng: 31.092606 }, { lat: 30.709999, lng: 31.091172 }, { lat: 30.716194, lng: 31.092604 }, { lat: 30.721446, lng: 31.096685 }, { lat: 30.724955, lng: 31.102794 }] },
  { name: "قويسنا", kind: "city", deliveryFee: 100, polygon: [{ lat: 30.599973, lng: 31.157 }, { lat: 30.597234, lng: 31.172993 }, { lat: 30.589433, lng: 31.186549 }, { lat: 30.577761, lng: 31.195603 }, { lat: 30.563993, lng: 31.198777 }, { lat: 30.550228, lng: 31.195592 }, { lat: 30.53856, lng: 31.186533 }, { lat: 30.530764, lng: 31.172982 }, { lat: 30.528027, lng: 31.157 }, { lat: 30.530764, lng: 31.141018 }, { lat: 30.53856, lng: 31.127467 }, { lat: 30.550228, lng: 31.118408 }, { lat: 30.563993, lng: 31.115223 }, { lat: 30.577761, lng: 31.118397 }, { lat: 30.589433, lng: 31.127451 }, { lat: 30.597234, lng: 31.141007 }] },
  { name: "شبين الكوم", kind: "city", deliveryFee: 100, polygon: [{ lat: 30.594973, lng: 31.01 }, { lat: 30.592234, lng: 31.025992 }, { lat: 30.584433, lng: 31.039547 }, { lat: 30.572761, lng: 31.048601 }, { lat: 30.558993, lng: 31.051775 }, { lat: 30.545228, lng: 31.04859 }, { lat: 30.53356, lng: 31.039532 }, { lat: 30.525764, lng: 31.025981 }, { lat: 30.523027, lng: 31.01 }, { lat: 30.525764, lng: 30.994019 }, { lat: 30.53356, lng: 30.980468 }, { lat: 30.545228, lng: 30.97141 }, { lat: 30.558993, lng: 30.968225 }, { lat: 30.572761, lng: 30.971399 }, { lat: 30.584433, lng: 30.980453 }, { lat: 30.592234, lng: 30.994008 }] },
  { name: "طنطا", kind: "city", deliveryFee: 150, polygon: [{ lat: 30.830966, lng: 31 }, { lat: 30.827542, lng: 31.020039 }, { lat: 30.817791, lng: 31.037024 }, { lat: 30.803199, lng: 31.048366 }, { lat: 30.785989, lng: 31.052342 }, { lat: 30.768783, lng: 31.048349 }, { lat: 30.754199, lng: 31.036999 }, { lat: 30.744455, lng: 31.020022 }, { lat: 30.741034, lng: 31 }, { lat: 30.744455, lng: 30.979978 }, { lat: 30.754199, lng: 30.963001 }, { lat: 30.768783, lng: 30.951651 }, { lat: 30.785989, lng: 30.947658 }, { lat: 30.803199, lng: 30.951634 }, { lat: 30.817791, lng: 30.962976 }, { lat: 30.827542, lng: 30.979961 }] },
  { name: "بنها", kind: "city", deliveryFee: 100, polygon: [{ lat: 30.501973, lng: 31.185 }, { lat: 30.499234, lng: 31.200977 }, { lat: 30.491433, lng: 31.214519 }, { lat: 30.479761, lng: 31.223564 }, { lat: 30.465993, lng: 31.226735 }, { lat: 30.452228, lng: 31.223553 }, { lat: 30.44056, lng: 31.214504 }, { lat: 30.432764, lng: 31.200966 }, { lat: 30.430027, lng: 31.185 }, { lat: 30.432764, lng: 31.169034 }, { lat: 30.44056, lng: 31.155496 }, { lat: 30.452228, lng: 31.146447 }, { lat: 30.465993, lng: 31.143265 }, { lat: 30.479761, lng: 31.146436 }, { lat: 30.491433, lng: 31.155481 }, { lat: 30.499234, lng: 31.169023 }] }
] as const;

const categories = [
  { key: "مطاعم", name: "المطاعم", emoji: "🍔", tint: "#FDE7D9" },
  { key: "pharmacies", name: "الصيدليات", emoji: "💊", tint: "#E6F4F1" },
  { key: "groceries", name: "البقالة", emoji: "🛍️", tint: "#E3EEFB" },
  { key: "flowers", name: "الورود", emoji: "💐", tint: "#FCE7F1" },
  { key: "fruits", name: "الخضروات والفاكهة", emoji: "🥬", tint: "#E8F5E9" },
  { key: "bakery", name: "المخبوزات", emoji: "🍞", tint: "#FDF2E1" },
  { key: "sweets", name: "الحلويات", emoji: "🍰", tint: "#FCE8F1" },
  { key: "cafe", name: "الكافيه", emoji: "☕", tint: "#EFE9E1" },
] as const;

type CategoryKey = "مطاعم" | "pharmacies" | "groceries" | "flowers" | "fruits" | "bakery" | "sweets" | "cafe";
type OptionGroup = Infer<typeof optionGroup>;
type SeedProduct = {
  name: string;
  description: string;
  price: number;
  emoji: string;
  available?: boolean;
  optionGroups?: OptionGroup[];
};

const extras = (options: [key: string, name: string, priceDelta: number][]): OptionGroup => ({
  key: "extras",
  name: "إضافات",
  min: 0,
  max: options.length,
  options: options.map(([key, name, priceDelta]) => ({ key, name, priceDelta })),
});

const shops: {
  category: CategoryKey;
  name: string;
  description: string;
  emoji: string;
  tint: string;
  kind?: string;
  imageUrl?: string;
  hours: WeeklyHours;
  paused?: boolean;
  minOrder: number;
  prepMinutes: number;
  rating: number;
  sortOrder: number;
  menu: { section: string; products: SeedProduct[] }[];
}[] = [
  {
    category: "مطاعم",
    name: "جوهر",
    description: "مطعم جوهر المميز",
    emoji: "🍔",
    tint: "#FDE7D9",
    kind: "وجبات سريعة",
    imageUrl: "https://res.cloudinary.com/dofy7vd1y/image/upload/v1774471754/WhatsApp_Image_2026-03-16_at_11.51.55_vvlr31.jpg",
    hours: everyDay(h(12), h(2)),
    minOrder: 50,
    prepMinutes: 25,
    rating: 4.7,
    sortOrder: 1,
    menu: [
      {
        section: "البرجر",
        products: [
          {
            name: "كلاسيك برجر",
            description: "لحم 150 جم، خس، طماطم، صوص الميدان",
            price: 85,
            emoji: "🍔",
            optionGroups: [
              {
                key: "patty",
                name: "عدد القطع",
                min: 1,
                max: 1,
                options: [
                  { key: "single", name: "سنجل", priceDelta: 0 },
                  { key: "double", name: "دبل", priceDelta: 45 },
                ],
              },
              extras([
                ["cheese", "جبنة شيدر", 10],
                ["bacon", "بيف بيكون", 20],
                ["jalapeno", "هالبينو", 5],
              ]),
            ],
          },
        ],
      },
    ],
  },
  {
    category: "مطاعم",
    name: "فولكانو",
    description: "فولكانو - برجر حار ومميز",
    emoji: "🌋",
    tint: "#FCE3E1",
    kind: "برجر",
    imageUrl: "https://res.cloudinary.com/dofy7vd1y/image/upload/v1774471271/download_1_zh5neh.jpg",
    hours: everyDay(h(10), h(24)),
    minOrder: 60,
    prepMinutes: 30,
    rating: 4.5,
    sortOrder: 2,
    menu: [
      {
        section: "البرجر",
        products: [
          { name: "فولكانو برجر", description: "برجر حار مع جبنة", price: 95, emoji: "🍔" },
        ],
      },
    ],
  },
  {
    category: "مطاعم",
    name: "كاتشب",
    description: "كاتشب - وجبات سريعة ولذيذة",
    emoji: "🍟",
    tint: "#FFF1CC",
    kind: "وجبات سريعة",
    imageUrl: "https://res.cloudinary.com/dofy7vd1y/image/upload/v1774471622/download_2_nhxjwq.jpg",
    hours: everyDay(h(9), h(1)),
    minOrder: 30,
    prepMinutes: 15,
    rating: 4.6,
    sortOrder: 3,
    menu: [
      {
        section: "وجبات",
        products: [
          { name: "ميل كاتشب", description: "برجر + بطاطس + مشروب", price: 75, emoji: "🍔" },
          { name: "بطاطس", description: "بطاطس مقلية مقرمشة", price: 25, emoji: "🍟" },
        ],
      },
    ],
  },
  {
    category: "مطاعم",
    name: "مكسيكانو",
    description: "مكسيكانو - نكهات مكسيكية",
    emoji: "🌮",
    tint: "#F6E6D6",
    kind: "مكسيكي",
    imageUrl: "https://scontent.faly1-2.fna.fbcdn.net/v/t39.30808-6/657856989_1342281547921183_8981128263191348942_n.jpg?stp=dst-jpg_tt6&cstp=mx960x960&ctp=s960x960&_nc_cat=110&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeFG-v9VRNLi1uV7G5bJOLNcgddT9LSd4MGB11P0tJ3gwa4YksMhijCKPSNICgZeoOkR_w0SqgfaN_d3qgybYSvh&_nc_ohc=8YQxiKbGvqAQ7kNvwHniIBH&_nc_oc=AdpXPbPH4MDo34mzAzaSTihhyYtjoDhQokJy-kXJ52swvmjv-cMir4QftHNGcQR-OC0&_nc_zt=23&_nc_ht=scontent.faly1-2.fna&_nc_gid=AhmuxkEcuUNALkOlbxe2yg&_nc_ss=7b2a8&oh=00_AQRboprTe_fshP-ydOP8vHFuP8hW24uIonDXnKWXP1o51Q&oe=6AF7B970",
    hours: everyDay(h(13), h(23), [FRIDAY]),
    minOrder: 100,
    prepMinutes: 40,
    rating: 4.8,
    sortOrder: 4,
    menu: [
      {
        section: "مكسيكي",
        products: [
          { name: "تاكو", description: "تاكو لحم مع صوص", price: 45, emoji: "🌮" },
        ],
      },
    ],
  },
  {
    category: "مطاعم",
    name: "الأصلى",
    description: "الأصلى - أكل بيتي أصيل",
    emoji: "🍲",
    tint: "#E3EEFB",
    kind: "أكل بيتي",
    imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTdolUeSraRvA_n5Bn3XdfSun6c4D7nNu6ePE4Hj4ud2g&s=10",
    hours: everyDay(h(10), h(23)),
    paused: true,
    minOrder: 50,
    prepMinutes: 20,
    rating: 4.4,
    sortOrder: 5,
    menu: [
      {
        section: "رئيسية",
        products: [
          { name: "مقلوبة", description: "أرز ولحمة وخضار", price: 85, emoji: "🍚" },
        ],
      },
    ],
  },
  {
    category: "مطاعم",
    name: "ابو يارا",
    description: "ابو يارا - مشويات ومشروبات",
    emoji: "🍢",
    tint: "#DDF3EA",
    kind: "مشويات",
    imageUrl: "https://api.mat3am.net/assets/2021/12/19/png/ac7ed4db-91cb-4f4a-af8d-1c3037507e72.png",
    hours: everyDay(h(8), h(2)),
    minOrder: 25,
    prepMinutes: 10,
    rating: 4.3,
    sortOrder: 6,
    menu: [
      {
        section: "مشويات",
        products: [
          { name: "شيش طاووق", description: "صدور دجاج مشوية", price: 80, emoji: "🍢" },
        ],
      },
    ],
  },
  {
    category: "مطاعم",
    name: "البرنس",
    description: "البرنس - بيتزا وفطائر",
    emoji: "🐟",
    tint: "#FBE4EE",
    kind: "أسماك",
    hours: everyDay(h(10), h(23)),
    minOrder: 50,
    prepMinutes: 25,
    rating: 4.5,
    sortOrder: 7,
    menu: [
      {
        section: "بيتزا",
        products: [
          { name: "بيتزا مارجريتا", description: "جبنة وصلصة طماطم", price: 70, emoji: "🍕" },
        ],
      },
    ],
  },
  {
    category: "مطاعم",
    name: "قرمشة",
    description: "قرمشة - وجبات مقرمشة",
    emoji: "🥪",
    tint: "#FDE7D9",
    kind: "سندوتشات",
    imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTMw8ZNLOh10ITTWdXf7Q5byJ14KAxmLj1Xtob8pDckpg&s=10",
    hours: everyDay(h(12), h(2)),
    minOrder: 50,
    prepMinutes: 25,
    rating: 4.7,
    sortOrder: 8,
    menu: [
      {
        section: "سندوتشات",
        products: [
          { name: "سندوتش برجر", description: "لحم مع خس وطماطم", price: 55, emoji: "🍔" },
        ],
      },
    ],
  },
  {
    category: "مطاعم",
    name: "سعيد السورى",
    description: "سعيد السورى - شاورما ومشاوي",
    emoji: "🌯",
    tint: "#E6F4F1",
    kind: "شاورما",
    hours: everyDay(h(9), h(3)),
    minOrder: 0,
    prepMinutes: 15,
    rating: 4.9,
    sortOrder: 9,
    menu: [
      {
        section: "شاورما",
        products: [
          { name: "شاورما فراخ", description: "مع ثومية ومخلل", price: 40, emoji: "🌯" },
        ],
      },
    ],
  },
  {
    category: "pharmacies",
    name: "صيدلية الشفاء",
    description: "أدوية ومستلزمات طبية",
    emoji: "💊",
    tint: "#E6F4F1",
    kind: "صيدلية",
    hours: everyDay(h(9), h(3)),
    minOrder: 0,
    prepMinutes: 15,
    rating: 4.9,
    sortOrder: 17,
    menu: [
      {
        section: "مستلزمات",
        products: [
          { name: "باراسيتامول 500 مجم", description: "شريط 20 قرص", price: 25, emoji: "💊" },
          { name: "كمامات طبية", description: "علبة 50 قطعة", price: 45, emoji: "😷" },
        ],
      },
    ],
  },
  {
    category: "مطاعم",
    name: "شاورما الشام",
    description: "شاورما الشام - شاورما وفلافل",
    emoji: "🥙",
    tint: "#FCE3E1",
    kind: "شاورما",
    imageUrl: "https://scontent.faly1-2.fna.fbcdn.net/v/t39.30808-1/742381621_984814701235422_5385788468906646427_n.jpg?stp=dst-jpg_tt6&cstp=mx1080x1073&ctp=s200x200&_nc_cat=107&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=2d3e12&_nc_eui2=AeEEeRxAt9veLsjoJI7KQ0-0px8Ep0CjJaOnHwSnQKMlo6pXiHO4w7ZumRrYxNqVRdxVmiX8GHBj1zHIb_dyfK5h&_nc_ohc=aGxVr87WUEQQ7kNvwFStTVN&_nc_oc=Ado-W8MePHWHWGCKOGbr36P21kPXhgjjI0Vk8QRyoxF27H-Ow4PtIkTGVHePFMj39zQ&_nc_zt=24&_nc_ht=scontent.faly1-2.fna&_nc_gid=g7k9GPXUWBiE7eNBdlT-jw&_nc_ss=7b2a8&oh=00_AQSU6c15kSUVOu2zs-h7K9pGCEcxJ689rDnfDZDGkf6hGw&oe=6AF7CBE8",
    hours: everyDay(h(9), h(3)),
    minOrder: 30,
    prepMinutes: 15,
    rating: 4.8,
    sortOrder: 18,
    menu: [
      {
        section: "شاورما",
        products: [
          { name: "شاورما دجاج", description: "مع ثومية ومخلل", price: 35, emoji: "🥙" },
          { name: "فلافل", description: "فلافل طازج", price: 15, emoji: "🧆" },
        ],
      },
    ],
  },
];

const drivers = [
  { name: "محمود حسن", phone: "01001234567" },
  { name: "أحمد سعيد", phone: "01112345678" },
];

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Upsert zones without clearing existing data
    for (const [sortOrder, zone] of zones.entries()) {
      const existing = await ctx.db.query("zones").filter((q) => q.eq(q.field("name"), zone.name)).collect();
      const keeperZone = existing.sort((a, b) => a._creationTime - b._creationTime)[0];
      const zoneData = {
        ...zone,
        active: true,
        sortOrder,
        polygon: zone.polygon.map((p) => ({ lat: p.lat, lng: p.lng })),
      };
      if (keeperZone !== undefined) {
        await ctx.db.patch(keeperZone._id, zoneData);
      } else {
        await ctx.db.insert("zones", zoneData);
      }
    }
    await dedupeZonesByName(ctx);
    const wantedZones = new Set(zones.map((z) => z.name as string));
    for (const zoneRow of await ctx.db.query("zones").collect()) {
      if (!wantedZones.has(zoneRow.name) && zoneRow.active) {
        await ctx.db.patch(zoneRow._id, { active: false });
      }
    }
    const categoryIds: Map<CategoryKey, Id<"categories">> = await canonicalCategories(ctx);
    for (const { category, menu, paused = false, ...shop } of shops) {
      const categoryId = categoryIds.get(category);
      if (!categoryId) throw new Error(`unknown category ${category}`);
      const existingShop = await ctx.db.query("shops").filter((q) => q.eq(q.field("name"), shop.name)).collect();
      // Patch the row the dedupe keeps (the oldest, since plain scans return rows in
      // ascending creation order) so the fields aren't lost when duplicates collapse.
      const keeperShop = existingShop.sort((a, b) => a._creationTime - b._creationTime)[0];
      let shopId: Id<"shops">;
      if (keeperShop !== undefined) {
        shopId = keeperShop._id;
        await ctx.db.patch(shopId, { ...shop, categoryId, paused, sortOrder: shop.sortOrder });
      } else {
        shopId = await ctx.db.insert("shops", { ...shop, categoryId, paused, sortOrder: shop.sortOrder });
      }
      for (const [sortOrder, { section, products }] of menu.entries()) {
        const existingSection = await ctx.db.query("menuSections")
          .withIndex("by_shop", (q) => q.eq("shopId", shopId)).filter((q) => q.eq(q.field("name"), section))
          .collect();
        const keeperSection = existingSection.sort((a, b) => a._creationTime - b._creationTime)[0];
        let sectionId: Id<"menuSections">;
        if (keeperSection !== undefined) {
          sectionId = keeperSection._id;
          await ctx.db.patch(sectionId, { name: section, sortOrder });
        } else {
          sectionId = await ctx.db.insert("menuSections", { shopId, name: section, sortOrder });
        }
        for (const { available = true, optionGroups = [], ...product } of products) {
          const existingProduct = await ctx.db.query("products")
          .withIndex("by_shop", (q) => q.eq("shopId", shopId)).filter((q) => q.eq(q.field("name"), product.name))
          .collect();
          const keeperProduct = existingProduct.sort((a, b) => a._creationTime - b._creationTime)[0];
          if (keeperProduct !== undefined) {
            await ctx.db.patch(keeperProduct._id, {
              ...product,
              shopId,
              sectionId,
              available,
              optionGroups,
            });
          } else {
            await ctx.db.insert("products", { ...product, shopId, sectionId, available, optionGroups });
          }
        }
      }
    }
    for (const driver of drivers) {
      const existingDriver = await ctx.db.query("drivers").filter((q) => q.eq(q.field("name"), driver.name)).collect();
      const keeperDriver = existingDriver.sort((a, b) => a._creationTime - b._creationTime)[0];
      if (keeperDriver !== undefined) {
        await ctx.db.patch(keeperDriver._id, { ...driver, active: true });
      } else {
        await ctx.db.insert("drivers", { ...driver, active: true });
      }
    }
    // Collapse anything that slipped through as a duplicate (e.g. a previous seed run
    // inserted the same name under a re-created deployment).
    await dedupeShopsByName(ctx);
    await dedupeDriversByName(ctx);
    await dedupeMenu(ctx);
    // Shops pruned from the seed list above are gone from the deployment as well.
    await pruneRemovedSeedShops(ctx);
    // Categories/shops must always carry a slug: the UI routes by it.
    await ensureSlugs(ctx);
    return "seeded";
  },
});

// Old spellings that earlier seed generations stored under different names; every one of
// them must be merged onto the canonical row so re-seeding cannot stack duplicates.
const CATEGORY_ALIASES: Record<string, string[]> = {
  المطاعم: ["مطاعم", "طعام", "الطعام"],
  الصيدليات: ["صيدليات", "صيدلية", "صيديليات"],
  البقالة: ["بقالة", "بقاليات"],
  الورود: ["زهور", "زهورات"],
  "الخضروات والفاكهة": ["خضروات وفاكهة", "الفاكهة", "الخضروات", "فواكه", "خضروات"],
  المخبوزات: ["مخبوزات", "مخبز"],
  الحلويات: ["حلويات"],
  الكافيه: ["كافيه", "قهوة"],
};

// One row per canonical category, with its fields synced and every alias (or exact-name
// duplicate) merged into it. Shops pointing at a merged row are re-pointed at the keeper
// before the row is deleted, keeping every `categoryId` valid.
async function canonicalCategories(ctx: MutationCtx): Promise<Map<CategoryKey, Id<"categories">>> {
  const categoryIds = new Map<CategoryKey, Id<"categories">>();
  for (const [sortOrder, { key, ...category }] of categories.entries()) {
    const aliases = CATEGORY_ALIASES[category.name] ?? [];
    const matches = (await ctx.db.query("categories").collect()).filter(
      (row) => row.name === category.name || aliases.includes(row.name),
    );
    if (matches.length === 0) {
      categoryIds.set(key, await ctx.db.insert("categories", { ...category, slug: key, sortOrder }));
      continue;
    }
    // Prefer a row that already carries the canonical name, oldest wins on ties.
    const keeper = matches.find((row) => row.name === category.name) ?? matches[0];
    await ctx.db.patch(keeper._id, { ...category, slug: key, sortOrder });
    for (const row of matches) {
      if (row._id === keeper._id) continue;
      for (const shop of await ctx.db
        .query("shops")
        .withIndex("by_category", (q) => q.eq("categoryId", row._id))
        .collect()) {
        await ctx.db.patch(shop._id, { categoryId: keeper._id });
      }
      await ctx.db.delete(row._id);
    }
    categoryIds.set(key, keeper._id);
  }
  return categoryIds;
}

// Collapses shops that share a name onto their oldest row: menu sections and products are
// migrated onto the keeper (duplicate section names map onto the keeper's section), orders
// are re-pointed, and the duplicate shop row is deleted.
async function dedupeShopsByName(ctx: MutationCtx): Promise<number> {
  const shops = await ctx.db.query("shops").collect();
  const keepers = new Map<string, Doc<"shops">>();
  let removed = 0;
  for (const shop of shops) {
    // The plain scan returns rows in ascending creation order, so the first row per name wins.
    const keeper = keepers.get(shop.name);
    if (keeper === undefined) {
      keepers.set(shop.name, shop);
      continue;
    }
    const keeperSections = await ctx.db
      .query("menuSections")
      .withIndex("by_shop", (q) => q.eq("shopId", keeper._id))
      .collect();
    for (const section of await ctx.db
      .query("menuSections")
      .withIndex("by_shop", (q) => q.eq("shopId", shop._id))
      .collect()) {
      const replacement = keeperSections.find((s) => s.name === section.name);
      if (replacement !== undefined) {
        for (const product of await ctx.db
          .query("products")
          .withIndex("by_section", (q) => q.eq("sectionId", section._id))
          .collect()) {
          await ctx.db.patch(product._id, { shopId: keeper._id, sectionId: replacement._id });
        }
        await ctx.db.delete(section._id);
      } else {
        await ctx.db.patch(section._id, { shopId: keeper._id });
        for (const product of await ctx.db
          .query("products")
          .withIndex("by_section", (q) => q.eq("sectionId", section._id))
          .collect()) {
          await ctx.db.patch(product._id, { shopId: keeper._id });
        }
      }
    }
    for (const product of await ctx.db
      .query("products")
      .withIndex("by_shop", (q) => q.eq("shopId", shop._id))
      .collect()) {
      await ctx.db.patch(product._id, { shopId: keeper._id });
    }
    for (const order of (await ctx.db.query("orders").collect()).filter((o) => o.shopId === shop._id)) {
      await ctx.db.patch(order._id, { shopId: keeper._id });
    }
    await ctx.db.delete(shop._id);
    removed += 1;
  }
  return removed;
}

// Same treatment for zones: addresses pointing at a merged zone are re-pointed first.
async function dedupeZonesByName(ctx: MutationCtx): Promise<number> {
  const zones = await ctx.db.query("zones").collect();
  const keepers = new Map<string, Doc<"zones">>();
  let removed = 0;
  for (const zone of zones) {
    const keeper = keepers.get(zone.name);
    if (keeper === undefined) {
      keepers.set(zone.name, zone);
      continue;
    }
    for (const address of (await ctx.db.query("addresses").collect()).filter((a) => a.zoneId === zone._id)) {
      await ctx.db.patch(address._id, { zoneId: keeper._id });
    }
    await ctx.db.delete(zone._id);
    removed += 1;
  }
  return removed;
}

async function dedupeDriversByName(ctx: MutationCtx): Promise<number> {
  const drivers = await ctx.db.query("drivers").collect();
  const seen = new Set<string>();
  let removed = 0;
  for (const driver of drivers) {
    if (seen.has(driver.name)) {
      await ctx.db.delete(driver._id);
      removed += 1;
    } else {
      seen.add(driver.name);
    }
  }
  return removed;
}

// The seed list is the source of truth for the catalog: a shop pruned from it is deleted here
// together with its menu, so removing an entry from `shops` also removes it from the site.
// Orders are kept untouched — they store their own snapshots (shopName and item lines) and the
// UI already renders a missing shop as "not available".
async function pruneRemovedSeedShops(ctx: MutationCtx): Promise<number> {
  const wanted = new Set(shops.map((shop) => shop.name));
  const orphans = (await ctx.db.query("shops").collect()).filter((shop) => !wanted.has(shop.name));
  for (const shop of orphans) {
    for (const section of await ctx.db
      .query("menuSections")
      .withIndex("by_shop", (q) => q.eq("shopId", shop._id))
      .collect()) {
      for (const product of await ctx.db
        .query("products")
        .withIndex("by_section", (q) => q.eq("sectionId", section._id))
        .collect()) {
        await ctx.db.delete(product._id);
      }
      await ctx.db.delete(section._id);
    }
    for (const product of await ctx.db
      .query("products")
      .withIndex("by_shop", (q) => q.eq("shopId", shop._id))
      .collect()) {
      await ctx.db.delete(product._id);
    }
    await ctx.db.delete(shop._id);
  }
  return orphans.length;
}

// Deletes shops that are no longer part of the seed list (with their menus). Run it after
// pruning `shops` in this file to make the removal reach the site immediately.
export const pruneRemovedShops = internalMutation({
  args: {},
  handler: async (ctx) => {
    const removed = await pruneRemovedSeedShops(ctx);
    return { removed };
  },
});

// Merges duplicate menu sections and products left inside one shop by repeated seed runs:
// each (shop, name) pair keeps its oldest row, products under a merged section are re-pointed
// first, and only truly duplicate product rows are deleted.
async function dedupeMenu(ctx: MutationCtx): Promise<{ sections: number; products: number }> {
  let removedSections = 0;
  let removedProducts = 0;
  const sections = await ctx.db.query("menuSections").collect();
  const keeperSections = new Map<string, Doc<"menuSections">>();
  for (const section of sections) {
    const key = `${section.shopId}|${section.name}`;
    const keeper = keeperSections.get(key);
    if (keeper === undefined) {
      keeperSections.set(key, section);
      continue;
    }
    for (const product of await ctx.db
      .query("products")
      .withIndex("by_section", (q) => q.eq("sectionId", section._id))
      .collect()) {
      await ctx.db.patch(product._id, { sectionId: keeper._id });
    }
    await ctx.db.delete(section._id);
    removedSections += 1;
  }
  const products = await ctx.db.query("products").collect();
  const keeperProducts = new Set<string>();
  for (const product of products) {
    const key = `${product.shopId}|${product.name}`;
    if (keeperProducts.has(key)) {
      await ctx.db.delete(product._id);
      removedProducts += 1;
    } else {
      keeperProducts.add(key);
    }
  }
  return { sections: removedSections, products: removedProducts };
}

// Fixes seed data that was inserted more than once: merges duplicate/aliased categories,
// zones, shops and drivers back onto their canonical rows without dropping any reference.
export const cleanupDuplicates = internalMutation({
  args: {},
  handler: async (ctx) => {
    await canonicalCategories(ctx);
    const removedZones = await dedupeZonesByName(ctx);
    const removedShops = await dedupeShopsByName(ctx);
    const removedDrivers = await dedupeDriversByName(ctx);
    const menu = await dedupeMenu(ctx);
    return { removedZones, removedShops, removedDrivers, menu };
  },
});

// Ensures the seed categories exist (matched by canonical name or an old alias). Inserts missing
// ones, updates emoji/tint/slug/sortOrder for existing ones, and merges duplicates — without
// deleting shops or other data.
export const upsertCategories = internalMutation({
  args: {},
  handler: async (ctx) => {
    const ids = await canonicalCategories(ctx);
    return { categories: Object.fromEntries(ids) };
  },
});

// Backward-compatible alias.
export const syncCategories = internalMutation({
  args: {},
  handler: async (ctx) => await canonicalCategories(ctx),
});

export const resetDeliveryZones = internalMutation({
  args: {},
  handler: async (ctx) => {
    const wanted = new Set(zones.map((z) => z.name as string));
    for (const [sortOrder, zone] of zones.entries()) {
      const existing = await ctx.db.query("zones").filter((q) => q.eq(q.field("name"), zone.name)).collect();
      const keeper = existing.sort((a, b) => a._creationTime - b._creationTime)[0];
      const zoneData = {
        ...zone,
        active: true,
        sortOrder,
        polygon: zone.polygon.map((p) => ({ lat: p.lat, lng: p.lng })),
      };
      if (keeper !== undefined) {
        await ctx.db.patch(keeper._id, zoneData);
      } else {
        await ctx.db.insert("zones", zoneData);
      }
    }
    await dedupeZonesByName(ctx);
    for (const row of await ctx.db.query("zones").collect()) {
      if (!wanted.has(row.name)) {
        await ctx.db.patch(row._id, { active: false });
      }
    }
    return { active: (await ctx.db.query("zones").collect()).filter((z) => z.active).length };
  },
});