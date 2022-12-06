import template from './helloWorld.story.html';

export default {
    title: 'Hello World',
    template,
    variations: {
        Default: {},
        'With Name': { personName: 'Neymar Jr.' }
    }
}