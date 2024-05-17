const TEXT_TYPE = "Text_SanSerif";
const CHECKBOX_TYPE = "CheckBox";

const fieldDefinitions = [
    { name: "name", type: TEXT_TYPE },
    { name: "assistant", type: TEXT_TYPE },
    { name: "date", type: TEXT_TYPE },
    { name: "part_number", type: TEXT_TYPE },
    { name: "main_hall", type: CHECKBOX_TYPE },
    { name: "auxiliary_classroom_1", type: CHECKBOX_TYPE },
    { name: "auxiliary_classroom_2", type: CHECKBOX_TYPE }
];

exports.fields = fieldDefinitions.reduce((acc, { name, type }, i) => {
    acc[name] = { id: i + 1, type };
    return acc;
}, {});