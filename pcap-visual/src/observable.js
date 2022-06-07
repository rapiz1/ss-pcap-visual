import * as d3 from "d3";
import { humanReadableSize, normalize } from "./utils";
import chinaMap from "./china_simplify.json";
import { geoMercator, geoPath } from "d3-geo";

// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/sortable-bar-chart
export function BarChart(
  data,
  {
    x = (d, i) => i, // given d in data, returns the (ordinal) x-value
    y = (d) => d, // given d in data, returns the (quantitative) y-value
    width = 640, // the outer width of the chart; in pixels
    height = 400, // the outer height of the chart; in pixels
  } = {}
) {
  const marginTop = 20; // the top margin, in pixels
  const marginRight = 0; // the right margin; in pixels
  const marginBottom = 150; // the bottom margin; in pixels
  const marginLeft = 60; // the left margin; in pixels
  const xRange = [marginLeft, width - marginRight]; // [left; right]
  const yType = d3.scaleLinear; // type of y-scale
  const yRange = [height - marginBottom, marginTop]; // [bottom, top]
  const xPadding = 0.1; // amount of x-range to reserve to separate bars
  const color = "currentColor"; // bar fill color
  const initialDuration = 250; // transition duration, in milliseconds
  const initialDelay = (_, i) => i * 20; // per-element transition delay, in milliseconds
  const yFormat = "";
  const yLabel = "Traffic";
  let xDomain, yDomain;

  //Compute values.
  const X = d3.map(data, x);
  const Y = d3.map(data, y);

  // Compute default domains, and unique the x-domain.
  if (xDomain === undefined) xDomain = X;
  if (yDomain === undefined) yDomain = [0, d3.max(Y)];
  xDomain = new d3.InternSet(xDomain);

  // Omit any data not present in the x-domain.
  const I = d3.range(X.length).filter((i) => xDomain.has(X[i]));

  // Construct scales, axes, and formats.
  const xScale = d3.scaleBand(xDomain, xRange).padding(xPadding);
  const yScale = yType(yDomain, yRange);
  const xAxis = d3.axisBottom(xScale).tickSizeOuter(0);
  const format = humanReadableSize;
  const yAxis = d3
    .axisLeft(yScale)
    .ticks(height / 40, yFormat)
    .tickFormat(format);

  const svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

  const yGroup = svg
    .append("g")
    .attr("transform", `translate(${marginLeft},0)`)
    .call(yAxis)
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll(".tick").call(grid))
    .call((g) =>
      g
        .append("text")
        .attr("x", -marginLeft)
        .attr("y", 10)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .text(yLabel)
    );

  let barGroup = svg.append("g").attr("fill", color);
  let rect = barGroup.append("g").selectAll("rect");
  let label = barGroup
    .append("g")
    .attr("text-anchor", "middle")
    .attr("font-family", "sans-serif")
    .attr("font-size", 12)
    .selectAll("text");

  const xGroup = svg
    .append("g")
    .attr("transform", `translate(0,${height - marginBottom})`)
    .call(xAxis);

  // A helper method for updating the position of bars.
  function position(rect, x, y) {
    return rect
      .attr("x", x)
      .attr("y", y)
      .attr(
        "height",
        typeof y === "function" ? (i) => yScale(0) - y(i) : (i) => yScale(0) - y
      )
      .attr("width", xScale.bandwidth());
  }

  // A helper method for generating grid lines on the y-axis.
  function grid(tick) {
    return tick
      .append("line")
      .attr("class", "grid")
      .attr("x2", width - marginLeft - marginRight)
      .attr("stroke", "currentColor")
      .attr("stroke-opacity", 0.1);
  }

  // Call chart.update(data, options) to transition to new data.
  return Object.assign(svg.node(), {
    update(
      data,
      {
        duration = initialDuration, // transition duration, in milliseconds
        delay = initialDelay, // per-element transition delay, in milliseconds
      } = {}
    ) {
      // Compute values.
      const X = d3.map(data, x);
      const Y = d3.map(data, y);

      // Compute default domains, and unique the x-domain.
      let yDomain = [0, d3.max(Y)];
      let xDomain = new d3.InternSet(X);

      // Omit any data not present in the x-domain.
      const I = d3.range(X.length).filter((i) => xDomain.has(X[i]));

      // Update scale domains.
      xScale.domain(xDomain);
      yScale.domain(yDomain);

      // Start a transition.
      const t = svg.transition().duration(duration);

      // Join the data, applying enter and exit.
      rect = rect
        .data(I, function (i) {
          return this.tagName === "rect" ? this.key : X[i];
        })
        .join(
          (enter) =>
            enter
              .append("rect")
              .property("key", (i) => X[i]) // for future transitions
              .call(position, (i) => xScale(X[i]), yScale(0))
              .style("mix-blend-mode", "multiply")
              .call((enter) => enter.append("title")),
          (update) => update,
          (exit) =>
            exit
              .transition(t)
              .delay(delay)
              .attr("y", yScale(0))
              .attr("height", 0)
              .remove()
        );

      // Update the title text on all entering and updating bars.
      rect.select("title").text((i) => [X[i], format(Y[i])].join("\n"));

      // Transition entering and updating bars to their new position. Note
      // that this assumes that the input data and the x-domain are in the
      // same order, or else the ticks and bars may have different delays.
      rect
        .transition(t)
        .delay(delay)
        .call(
          position,
          (i) => xScale(X[i]),
          (i) => yScale(Y[i])
        );

      label = label
        .data(I)
        .join("text")
        .text((i) => format(Y[i]));
      label
        .transition(t)
        .delay(delay)
        .attr("x", (i) => xScale(X[i]) + xScale.bandwidth() / 2)
        .attr("y", (i) => yScale(Y[i]) - 4);

      // Transition the x-axis (using a possibly staggered delay per tick).
      xGroup
        .transition(t)
        .call(xAxis)
        .call((g) => g.selectAll(".tick").delay(delay));

      // Transition the y-axis, then post process for grid lines etc.
      yGroup
        .transition(t)
        .call(yAxis)
        .selection()
        .call((g) => g.select(".domain").remove())
        .call((g) =>
          g.selectAll(".tick").selectAll(".grid").data([,]).join(grid)
        );
    },
  });
}

export function TextScoller(width, height) {
  const fontSize = 12;
  const margin = 50;
  const svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: auto; height: intrinsic;");
  let text = svg
    .append("g")
    .attr("fill", "rgba(180, 180, 180, 1)")
    .attr("font-family", "Fira Code")
    .attr("font-size", fontSize)
    .selectAll("text");

  function position(d, i) {
    return i * fontSize + margin;
  }

  return Object.assign(svg.node(), {
    update(data) {
      const duration = 100;
      const t = svg.transition().duration(duration);
      text = text
        .data(data, (d) => d[1])
        .join(
          (enter) =>
            enter
              .append("text")
              .text((d) => d[0])
              .attr("y", position)
              .attr("opacity", 0)
              .call((enter) =>
                enter.transition(t.delay(duration)).attr("opacity", 1)
              ),
          (update) =>
            update.call((update) =>
              update
                .transition(t.delay(duration / 2))
                .attr("opacity", 1)
                .attr("y", position)
            ),
          (exit) =>
            exit.call((exit) => exit.transition(t).attr("opacity", 0).remove())
        );
    },
  });
}

export function ChinaMap(
  width, // the outer width of the chart; in pixels
  height // the outer height of the chart; in pixels
) {
  const mapBgColor = "rgba(235, 235, 240, 1)";
  const mapHgBgColor = "rgba(255, 255, 255, 1)";
  const mapLineColor = "rgba(220, 220, 220, 0.8)";

  const svg = d3.create("svg").attr("width", width).attr("height", height);
  const g = svg.append("g").attr("transform", "translate(0,0)");
  const dotG = svg.append("g");
  const tooltip = svg
    .append("g")
    .attr("fill", "rbga(100,100,100,1)")
    .attr("font-size", "14px")
    .attr("text-anchor", "end")
    .append("text");

  const projection = geoMercator()
    .center([107, 33])
    .scale(580)
    .translate([width / 2, height / 2]);

  const path = geoPath().projection(projection);

  //绘制地图
  g.selectAll("path")
    .data(chinaMap.features)
    .enter()
    .append("path")
    .attr("stroke", mapLineColor)
    .attr("stroke-width", 1)
    .attr("fill-opacity", 0.1)
    .attr("fill", mapBgColor)
    .attr("d", path)
    .on("mouseover", function () {
      const e = d3.select(this);
      e.transition().attr("fill", mapHgBgColor);
    })
    .on("mouseleave", function () {
      const e = d3.select(this);
      e.transition().attr("fill", mapBgColor);
    });

  return Object.assign(svg.node(), {
    addPoint(geo, traffic) {
      const maxCircleRadius = 20;
      const scatterRadius = 10;
      const showDurationInMs = 30 * 1000;

      const { lat, lon } = geo;
      if (lat === undefined) return;
      const pos = projection([lon, lat]);
      if (pos === null) {
        return;
      }
      const circleRadius = maxCircleRadius * normalize(traffic / 256);
      const scatter = Math.max(scatterRadius * Math.random(), circleRadius / 4);
      const angle = Math.random() * Math.PI * 2;
      pos[0] += Math.cos(angle) * scatter;
      pos[1] += Math.sin(angle) * scatter;
      const dot = dotG
        .append("circle")
        .attr("transform", (d) => `translate(${pos})`)
        .attr("fill", "rgba(0,0,255, 0.1)")
        .attr("r", 0)
        .on("mouseenter", function () {
          let npos = [pos[0], pos[1]];
          npos[1] += 30;
          tooltip
            .text(`${geo.city}, ${geo.query}, ${humanReadableSize(traffic)}`)
            .transition()
            .attr("opacity", 1)
            .attr("transform", (d) => `translate(${npos})`);
        })
        .on("mouseleave", function () {
          tooltip.transition().delay(200).attr("opacity", 0);
        })
        .transition()
        .attr("r", circleRadius);
      dot
        .transition()
        .delay(showDurationInMs * (3 + Math.random() / 4))
        .attr("r", 0)
        .remove();
    },
  });
}
