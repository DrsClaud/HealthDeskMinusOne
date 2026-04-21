
import NewDiseasesBox from "components/chat_new/GraphNodes";

export default {
    title: "Chat/NewDiseasesBox",
    component: NewDiseasesBox,
};

const Template = (args) => <NewDiseasesBox {...args} />;

export const Default = Template.bind({});
Default.args = {
    // Add any default props here
};

Default.parameters = {
    layout: 'centered',
    // backgrounds: {
    //     default: 'dark',
    //     values: [
    //         {
    //             name: 'dark',
    //             value: '#333333',
    //         },
    //     ],
    // },
};
