export const mapToArray = (props: Map<any, any>) => Array.from(props, ([_, value]) => (value));
export const randomString = (length: number) => new Array(length)
    .join()
    .replace(/(.|$)/g, () => ((Math.random() * 36) | 0).toString(36)[Math.random() < .5 ? 'toString' : 'toUpperCase']());