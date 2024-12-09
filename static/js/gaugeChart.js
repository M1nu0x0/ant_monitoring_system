export function drawGaugeChart(containerId, config) {
    const svg = d3.select(`#${containerId}`);
    const { width, height, padding } = config.dimensions;

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const params = {
        value: config.value || 50,
        previousValue: config.previousValue || 0,
        interval: config.interval || 1000,
        minValue: config.minValue || 0,
        maxValue: config.maxValue || 100,
        unitCount: config.unitCount || 50,
        strokeWeight: config.strokeWeight || 12,
        cornerRadius: config.cornerRadius || 6,
        startAngle: Math.PI * (-3 / 4), // Default: Left-bottom
        endAngle: Math.PI * (3 / 4), // Default: Right-bottom
        colorList: config.colorList || ["#FFD700", "#FF4500"],
        labelStep: config.labelStep || 20,
        labelOffset: config.labelOffset || -7,
        valueFontSize: config.valueFontSize || "32px",
        labelFontSize: config.labelFontSize || "12px",
        unitString: config.unitString || "%",
    };

    const angleScale = d3
        .scaleLinear()
        .domain([0, params.unitCount - 1])
        .range([params.startAngle, params.endAngle]);

    const colorScale = d3
        .scaleSequential(d3.interpolateRgb)
        .domain([0, params.unitCount - 1])
        .interpolator(d3.interpolateRgbBasis(params.colorList));

    const valueScale = d3
        .scaleLinear()
        .domain([params.minValue, params.maxValue])
        .range([0, params.unitCount - 1]);

    const radius = Math.min(width, height) / 2 - padding;
    const innerRadius = radius - params.strokeWeight;

    const arcGen = d3
        .arc()
        .innerRadius(innerRadius)
        .outerRadius(radius)
        .cornerRadius(params.cornerRadius);

    svg.selectAll("*").remove(); // Clear the chart

    // Background arcs
    svg
        .selectAll("path.bg")
        .data(d3.range(params.unitCount))
        .join("path")
        .attr("class", "bg")
        .attr("d", (d) =>
            arcGen({
                startAngle: angleScale(d),
                endAngle: angleScale(d + 1) - 0.02, // Add spacing
            })
        )
        .attr("transform", `translate(${width / 2}, ${height / 2})`)
        .attr("fill", "#ddd");

    // // Filled arcs
    // svg
    //     .selectAll("path.filled")
    //     .data(d3.range(Math.ceil(valueScale(params.value))))
    //     .join("path")
    //     .attr("class", "filled")
    //     .attr("d", (d) =>
    //         arcGen({
    //             startAngle: angleScale(d),
    //             endAngle: angleScale(d + 1) - 0.02,
    //         })
    //     )
    //     .attr("transform", `translate(${width / 2}, ${height / 2})`)
    //     .attr("fill", (d) => colorScale(d));

    // Filled arcs with animation
    let data = params.previousValue < params.value ? d3.range(Math.ceil(valueScale(params.value))) : d3.range(Math.ceil(valueScale(params.previousValue)));
    if (params.previousValue > params.value) {
        data = data.reverse();
    }
    const filled = svg
        .selectAll("path.filled")
        .data(data, (d) => d);

    filled
        .join("path")
        .attr("class", "filled")
        .attr("d", (d) =>
            arcGen({
                startAngle: angleScale(d),
                endAngle: angleScale(d + 1) - 0.02,
            })
        )
        .attr("transform", `translate(${width / 2}, ${height / 2})`)
        .attr("fill", (d) => colorScale(d))
        .attr("opacity", (d) =>
            d < valueScale(params.previousValue) ? 1 : 0
        )
        .transition()
        .delay((d, i) => params.interval / (params.unitCount+1) * i)
        .duration(params.interval / (params.unitCount+1))
        .attr("opacity", (d) =>
            d < valueScale(params.value) ? 1 : 0
        );

    // Value labels
    const labelRadius = innerRadius + params.labelOffset;
    const step = params.labelStep;

    d3.range(params.minValue, params.maxValue + step, step).forEach((value) => {
        if (value < params.minValue || value-1 > params.maxValue) {
            return;
        }
        const angle = angleScale(valueScale(value)) - Math.PI / 2;
        const x = width / 2 + Math.cos(angle) * labelRadius;
        const y = height / 2 + Math.sin(angle) * labelRadius;

        svg
            .append("text")
            .attr("x", x)
            .attr("y", y)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("fill", "#888")
            .attr("font-size", params.labelFontSize)
            .text(value);
    });

    // // Center value
    // svg
    //     .append("text")
    //     .attr("x", width / 2)
    //     .attr("y", height / 2 + 10)
    //     .attr("text-anchor", "middle")
    //     .attr("font-size", params.valueFontSize)
    //     .attr("fill", "#333")
    //     .text(`${params.value}%`);
    
    // Center value with animation
    const centerText = svg.selectAll("text.center-value").data([params.value]);

    centerText
        .join("text")
        .attr("class", "center-value")
        .attr("x", width / 2)
        .attr("y", height / 2 + 10)
        .attr("text-anchor", "middle")
        .attr("font-size", params.valueFontSize)
        .attr("fill", "#333")
        .transition()
        .duration(params.interval)
        .tween("text", function () {
            const interpolate = d3.interpolate(params.previousValue, params.value);
            return function (t) {
                this.textContent = `${Math.round(interpolate(t))}${params.unitString}`;
            };
        });
}
