declare module "ical.js" {
  interface JCalComponent {
    getAllSubcomponents(name?: string): JCalComponent[];
  }

  interface ICalEventLike {
    startDate?: { toJSDate(): Date };
    endDate?: { toJSDate(): Date };
  }

  const ICAL: {
    parse(input: string): unknown;
    Component: new (jcal: unknown) => JCalComponent;
    Event: new (component: JCalComponent) => ICalEventLike;
  };

  export default ICAL;
}
