import React, { useId } from 'react';
import type { ExercisePose } from '../../data/exerciseLibrary';

type Point = [number, number];
interface PosePoints { head: Point; hip: Point; leftArm: Point[]; rightArm: Point[]; leftLeg: Point[]; rightLeg: Point[] }

const poses: Record<ExercisePose, PosePoints> = {
  seated: { head: [125, 64], hip: [125, 146], leftArm: [[111, 92], [100, 122], [112, 145]], rightArm: [[140, 92], [151, 122], [140, 145]], leftLeg: [[119, 146], [93, 157], [93, 203]], rightLeg: [[133, 146], [157, 157], [157, 203]] },
  open: { head: [125, 63], hip: [125, 145], leftArm: [[111, 91], [85, 109], [56, 96]], rightArm: [[140, 91], [164, 108], [195, 93]], leftLeg: [[119, 145], [98, 159], [96, 202]], rightLeg: [[133, 145], [153, 159], [156, 202]] },
  march: { head: [125, 63], hip: [125, 145], leftArm: [[111, 91], [96, 117], [105, 146]], rightArm: [[140, 91], [155, 117], [149, 146]], leftLeg: [[119, 145], [91, 130], [78, 166]], rightLeg: [[133, 145], [155, 158], [156, 204]] },
  ankle: { head: [125, 63], hip: [125, 145], leftArm: [[111, 91], [99, 119], [106, 148]], rightArm: [[140, 91], [153, 120], [146, 148]], leftLeg: [[119, 145], [90, 164], [66, 180]], rightLeg: [[133, 145], [155, 158], [156, 204]] },
  stand: { head: [130, 47], hip: [129, 126], leftArm: [[115, 75], [98, 98], [76, 99]], rightArm: [[145, 75], [161, 98], [183, 99]], leftLeg: [[123, 126], [103, 163], [101, 207]], rightLeg: [[137, 126], [158, 163], [160, 207]] },
  wall: { head: [119, 56], hip: [104, 135], leftArm: [[110, 84], [148, 99], [192, 87]], rightArm: [[136, 84], [160, 111], [192, 103]], leftLeg: [[98, 135], [87, 173], [74, 207]], rightLeg: [[112, 135], [117, 173], [126, 207]] },
  calf: { head: [110, 40], hip: [110, 121], leftArm: [[97, 69], [120, 93], [166, 99]], rightArm: [[125, 69], [147, 91], [183, 99]], leftLeg: [[104, 121], [101, 158], [101, 199]], rightLeg: [[118, 121], [125, 158], [126, 199]] },
  stretch: { head: [130, 57], hip: [113, 136], leftArm: [[120, 85], [152, 99], [192, 87]], rightArm: [[145, 85], [167, 110], [192, 101]], leftLeg: [[107, 136], [81, 169], [56, 207]], rightLeg: [[121, 136], [152, 165], [150, 207]] },
  side: { head: [125, 45], hip: [125, 125], leftArm: [[110, 75], [83, 103], [57, 101]], rightArm: [[140, 75], [167, 102], [192, 101]], leftLeg: [[118, 125], [96, 163], [78, 207]], rightLeg: [[132, 125], [152, 163], [172, 207]] },
  balance: { head: [125, 46], hip: [125, 126], leftArm: [[110, 75], [83, 102], [60, 105]], rightArm: [[140, 75], [169, 94], [192, 101]], leftLeg: [[119, 126], [119, 165], [119, 208]], rightLeg: [[133, 126], [144, 165], [138, 199]] },
  walk: { head: [130, 44], hip: [125, 127], leftArm: [[116, 74], [96, 103], [74, 88]], rightArm: [[143, 74], [158, 102], [178, 114]], leftLeg: [[119, 127], [91, 162], [68, 207]], rightLeg: [[133, 127], [152, 167], [173, 207]] },
  breathe: { head: [125, 65], hip: [125, 146], leftArm: [[111, 93], [94, 125], [113, 141]], rightArm: [[140, 93], [158, 125], [137, 141]], leftLeg: [[119, 146], [77, 183], [127, 196]], rightLeg: [[133, 146], [173, 183], [125, 196]] },
};

export function ExerciseIllustration({ pose, color = '#9682b8', label, active = false }: {
  pose: ExercisePose; color?: string; label: string; active?: boolean;
}) {
  const id = useId().replace(/:/g, '');
  const points = poses[pose];
  const seated = ['seated', 'open', 'march', 'ankle'].includes(pose);
  const chair = pose === 'stand' || pose === 'calf';
  const legPath = (line: Point[]) => line.map(([x, y], index) => `${index ? 'L' : 'M'}${x} ${y}`).join(' ');
  return <svg viewBox="0 0 250 235" role="img" aria-label={label} className={`exercise-illustration ${active ? 'is-active' : ''}`}>
    <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop stopColor={color} /><stop offset="1" stopColor={color} stopOpacity=".75" /></linearGradient></defs>
    <circle className="exercise-pose-halo" cx="125" cy="125" r="85" fill={color} opacity=".07" />
    <ellipse cx="126" cy="216" rx="94" ry="7" fill={color} opacity=".12" />
    <rect x="41" y="211" width="174" height="4" rx="2" fill={color} opacity=".15" />
    {seated && <g fill="none" stroke="#b5b0ab" strokeWidth="5" strokeLinecap="round"><path d="M88 90v66h77M91 157v48m69-48v48" /></g>}
    {chair && <g fill="none" stroke="#b5b0ab" strokeWidth="5" strokeLinecap="round"><path d={pose === 'calf' ? 'M165 99h30v65h-39m8 0v44m28-44v44' : 'M64 105v58h61m-59 0v44m55-44v44'} /></g>}
    {['wall', 'stretch', 'side', 'balance'].includes(pose) && <path d="M200 50v160" stroke="#c2bab0" strokeWidth="5" strokeLinecap="round" />}
    <g className="exercise-pose-person">
      <path d={legPath(points.leftLeg)} fill="none" stroke="#55516d" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
      <path d={legPath(points.rightLeg)} fill="none" stroke="#6d6784" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
      {[points.leftLeg, points.rightLeg].map((line, index) => <path key={index} d={`M${line[2][0] - 4} ${line[2][1]}h14`} stroke="#eeeae4" strokeWidth="9" strokeLinecap="round" />)}
      <path d={`M${points.head[0] - 13} ${points.head[1] + 28}Q${points.head[0]} ${points.head[1] + 19} ${points.head[0] + 15} ${points.head[1] + 28}L${points.hip[0] + 15} ${points.hip[1] + 5}Q${points.hip[0]} ${points.hip[1] + 12} ${points.hip[0] - 15} ${points.hip[1] + 5}Z`} fill={`url(#${id})`} />
      <path d={legPath(points.leftArm)} fill="none" stroke="#d6a58c" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d={legPath(points.rightArm)} fill="none" stroke="#e2b39a" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`M${points.head[0]} ${points.head[1] + 13}v13`} stroke="#ddb097" strokeWidth="12" />
      <circle cx={points.head[0]} cy={points.head[1]} r="18" fill="#e2b39a" />
      <path d={`M${points.head[0] - 18} ${points.head[1] + 1}C${points.head[0] - 25} ${points.head[1] - 31} ${points.head[0] + 27} ${points.head[1] - 27} ${points.head[0] + 18} ${points.head[1] + 2}Q${points.head[0] + 7} ${points.head[1] - 2} ${points.head[0]} ${points.head[1] - 14}Q${points.head[0] - 7} ${points.head[1] - 2} ${points.head[0] - 18} ${points.head[1] + 1}`} fill="#464054" />
      <path d={`M${points.head[0] - 5} ${points.head[1] + 9}q5 4 10 0`} stroke="#b37f70" strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  </svg>;
}
