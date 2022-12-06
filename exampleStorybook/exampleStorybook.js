import { LightningElement } from "lwc";
import stories from './stories/index';

export default class ExampleStorybook extends LightningElement {
    stories = { ...stories };
}