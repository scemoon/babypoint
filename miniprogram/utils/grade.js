// utils/grade.js - 年级配置和升级逻辑
const GRADE_META = {
  'kindergarten_small':  { name: '幼儿园小班', level: 1,  stage: 'kindergarten', ageRange: '3-4岁' },
  'kindergarten_medium': { name: '幼儿园中班', level: 2,  stage: 'kindergarten', ageRange: '4-5岁' },
  'kindergarten_big':    { name: '幼儿园大班', level: 3,  stage: 'kindergarten', ageRange: '5-6岁' },
  'primary_1':           { name: '小学一年级', level: 4,  stage: 'primary',      ageRange: '6-7岁' },
  'primary_2':           { name: '小学二年级', level: 5,  stage: 'primary',      ageRange: '7-8岁' },
  'primary_3':           { name: '小学三年级', level: 6,  stage: 'primary',      ageRange: '8-9岁' },
  'primary_4':           { name: '小学四年级', level: 7,  stage: 'primary',      ageRange: '9-10岁' },
  'primary_5':           { name: '小学五年级', level: 8,  stage: 'primary',      ageRange: '10-11岁' },
  'primary_6':           { name: '小学六年级', level: 9,  stage: 'primary',      ageRange: '11-12岁' },
  'middle_1':            { name: '初中初一',   level: 10, stage: 'middle',       ageRange: '12-13岁' },
  'middle_2':            { name: '初中初二',   level: 11, stage: 'middle',       ageRange: '13-14岁' },
  'middle_3':            { name: '初中初三',   level: 12, stage: 'middle',       ageRange: '14-15岁' }
};

const GRADE_LIST = [
  { code: 'kindergarten_small',  name: '幼儿园小班' },
  { code: 'kindergarten_medium', name: '幼儿园中班' },
  { code: 'kindergarten_big',    name: '幼儿园大班' },
  { code: 'primary_1',           name: '小学一年级' },
  { code: 'primary_2',           name: '小学二年级' },
  { code: 'primary_3',           name: '小学三年级' },
  { code: 'primary_4',           name: '小学四年级' },
  { code: 'primary_5',           name: '小学五年级' },
  { code: 'primary_6',           name: '小学六年级' },
  { code: 'middle_1',            name: '初中初一' },
  { code: 'middle_2',            name: '初中初二' },
  { code: 'middle_3',            name: '初中初三' }
];

const GRADE_UPGRADE_MAP = {
  'kindergarten_small':  'kindergarten_medium',
  'kindergarten_medium': 'kindergarten_big',
  'kindergarten_big':    'primary_1',
  'primary_1':           'primary_2',
  'primary_2':           'primary_3',
  'primary_3':           'primary_4',
  'primary_4':           'primary_5',
  'primary_5':           'primary_6',
  'primary_6':           'middle_1',
  'middle_1':            'middle_2',
  'middle_2':            'middle_3',
  'middle_3':            null
};

function getGradeName(code) {
  return GRADE_META[code] ? GRADE_META[code].name : '';
}

function getGradeMeta(code) {
  return GRADE_META[code] || null;
}

module.exports = {
  GRADE_META,
  GRADE_LIST,
  GRADE_UPGRADE_MAP,
  getGradeName,
  getGradeMeta
};
