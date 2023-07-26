<script>
import * as d3 from 'd3';
import { onMount } from 'svelte';
import { vis_state } from './stores';

/**
 * Following 4 functions obtained from:
 * https://www.slingacademy.com/article/calculate-variance-and-standard-deviation-in-javascript/
 *
 */

// Calculate the average of all the numbers
const calculateMean = (values) => {
    const mean = (values.reduce((sum, current) => sum + current)) / values.length;
    return mean;
};

// Calculate variance
const calculateVariance = (values) => {
    const average = calculateMean(values);
    const squareDiffs = values.map((value) => {
        const diff = value - average;
        return diff * diff;
    });
    const variance = calculateMean(squareDiffs);
    return variance;
};

// Calculate stand deviation
const calculateSD = (variance) => {
    return Math.sqrt(variance);
};

function affix_sd_and_var_to_data(md_obj){
    let vals = [];
    if(md_obj.type[0] == "categorical"){
        for(let k of Object.keys(md_obj.distribution)){
            vals.push(md_obj.distribution[k]);
        }
    }
    else if(md_obj.type[0] == "continious"){
        let max = Number.MIN_SAFE_INTEGER;
        let min = Number.MAX_SAFE_INTEGER;
        for(let v of md_obj.values){
            vals.push(v.value);
            max = Math.max(v.value, max);
            min = Math.min(v.value, min);
        }
        md_obj['max'] = max;
        md_obj['min'] = min;
    }
    else{
        md_obj['var'] = 0;
        md_obj['sd'] = 0;
    }

    if(vals.length > 0){
        let variance = calculateVariance(vals);
        let sd = calculateSD(variance);

        md_obj['var'] = variance;
        md_obj['sd'] = sd;
    }
}

function data_categorizer(md_obj){
    /**
     * Test and Categorize Metadata
     */

    let test_val = md_obj.values[0].value;

    if(typeof(test_val) === typeof("")){
        let test_dict = {};

        for(let val of md_obj.values){
            if(!Object.keys(test_dict).includes(val.value)){
                test_dict[val.value] = 1;
            }else{
                test_dict[val.value] += 1;
            }
        }
        md_obj['distribution'] = test_dict;
        return ['categorical', 'qualitative'];
    }
    else if(typeof(test_val) === typeof(1) || typeof(test_val) === typeof(1.0)){
        let test_dict = {};
        //count unique values
        for(let val of md_obj.values){
            if(!Object.keys(test_dict).includes(`${val.value}`)){
                test_dict[val.value] = 1;
            }else{
                test_dict[val.value] += 1;
            }
            //determine if continious or discrete; with dumb threshold
            // will adjust if need be
            if(Object.keys(test_dict).length > 30){
                return ['continious', 'quantitative'];
            }
        }

        md_obj['distribution'] = test_dict;
        return ['categorical', 'quantitative'];
    }
    else{
        return ['complex', 'complex'];
    }

}

class MetadataCard{
    constructor(view_tag, min_height, max_height, width, metadata){
        this._group = d3.select(view_tag);
        this._height = min_height;
        this._expanded_height = max_height;
        this._width = width;
        this._data = metadata;
        this._is_expanded = false;
        
        /**
         * Public Vars
         */
        this.dirty = true;
        this.name = this._data.name;

        /**
         * Layout Vars
         */
        this._inner_margin = 10;
        this._spark_vis_margin = 30;
        this._icon_dims = [18,18];
        this._triangle_dims = [10, 18]
        this._text_left = this._icon_dims[1] + 6;
        this._triangle_left = this._width-this._triangle_dims[1]-this._inner_margin;

        /**
         * Layout vars setup
         */
        this._spark_vis_max_width = 170;
        this._spark_vis_height_margin = 7;
        this._spark_vis_height = this._height - (this._spark_vis_height_margin*2);

        this._expanded_vis_top_margin = 0;
        this._expanded_vis_height = this._expanded_height - this._height - (this._expanded_vis_top_margin);
        this._expanded_vis_width = this._width - (this._inner_margin*2);

        this.init();
    }

    handle_expand(){
        this._is_expanded = !this._is_expanded;
        this.dirty = true;

        if(!$vis_state.expanded.includes(this.name) && this._is_expanded){
            $vis_state.expanded = $vis_state.expanded.concat([this.name]);
        }
        else if(!this._is_expanded){
            $vis_state.expanded = $vis_state.expanded.filter((d)=>{return d !== this.name})
        }
    }

    truncate_string(s, chars){
        let test = s.slice(0,chars+3);
        let trunc = s.slice(0,chars);
        if (trunc[chars-1] === "."){
            trunc = trunc.slice(0,chars-1);
        }
        
        if(test === s){
            return test;
        }
        else{
            return `${trunc}...`
        }
    }

    init(){
        const self = this;

        //drawing order
        this._card_field = this._group.append('rect');
        this._icon = this._group.append('rect');
        this._text_tag = this._group.append('text');
        this._triangle = this._group.append('polygon');
        this._spark_vis_field = this._group.append('rect');
        this._spark_vis = this._group.append('g');
        this._expanded_vis = this._group.append('g');
        

        // console.log(this._data, this._group);
        this._card_field.attr('height', this._height)
                                .attr('width', this._width)
                                .attr('fill', 'rgba(200,200,200)')
                                .on('click', ()=>this.handle_expand());


        this._icon.attr('height', this._icon_dims[0])
                    .attr('width', this._icon_dims[1])
                    .attr('x', this._inner_margin)
                    .attr('y', this._inner_margin)
                    .attr('fill', 'rgb(150,80,80)');
        
        this._text_tag.text(()=>{
                        return this.truncate_string(this._data.name, 14);
                    })
                    .attr('x', this._inner_margin + this._text_left)
                    .attr('y', this._inner_margin)
                    .attr('dominant-baseline', 'hanging')
                    .attr('font-family', 'Arial, Helvetica, sans-serif');

        this._triangle.attr('points', `0,${this._triangle_dims[1]/2}  ${this._triangle_dims[0]},${this._triangle_dims[1]} ${this._triangle_dims[0]},0`)
                        .attr('fill', 'rgb(0,0,0)')
                        .attr('transform', `translate(${this._triangle_left},${this._inner_margin})`)
                        .on('click', ()=>this.handle_expand());


        // Render dependant layout vars
        this._spark_vis_left = this._inner_margin + this._text_left + this._text_tag.node().getBBox().width + this._spark_vis_margin;
        this._spark_vis_width = Math.min(this._spark_vis_max_width, this._width - this._spark_vis_left);
        //layout defintion from right to left
        this._spark_vis_x = this._triangle_left - this._spark_vis_width;
        
     
        this._spark_vis
            .attr('class', 'spark-vis')
            .attr('height', this._spark_vis_height)
            .attr('width', this._spark_vis_width)
            .attr('transform', `translate(${this._spark_vis_x},${this._spark_vis_height_margin})`)
            .on('click', ()=>this.handle_expand());

        this._expanded_vis
            .attr('class', 'expanded-vis')
            .attr('height', this._expanded_vis_height)
            .attr('width', this._expanded_vis_width)
            .attr('transform', `translate(${this._inner_margin},${this._height+this._expanded_vis_top_margin})`);
            // .on('click', ()=>this.handle_expand());
                
                              
    }

    render(){
        console.log("card render is called");
        const self = this;

        this._card_field.attr('height', ()=>{
            if(this._is_expanded){
                return this._expanded_height;
            }
            return this._height;
        });

        this._triangle.attr('points', ()=>{
            if(this._is_expanded){
                return `0,${this._triangle_dims[0]/2}  ${this._triangle_dims[1]/2},${this._triangle_dims[0]+this._triangle_dims[0]/2} ${this._triangle_dims[1]},${this._triangle_dims[0]/2}`
            }
            else{
                return`0,${this._triangle_dims[1]/2}  ${this._triangle_dims[0]},${this._triangle_dims[1]} ${this._triangle_dims[0]},0`
            }
        })

        this._text_tag.text(()=>{
                if(this._is_expanded){
                    return this._data.name;
                }
                else{
                    return this.truncate_string(this._data.name, 14);
                }
            })

        this._spark_vis.attr('visibility', ()=>{
                    if(this._is_expanded){
                        return 'hidden';
                    }
                    return 'visible';
                })

        this._expanded_vis.attr('visibility', ()=>{
                    if(!this._is_expanded){
                        return 'hidden';
                    }
                    return 'visible';
                })

        //reset the dirty flag so that it doesn't have to rerender if no change
        this.dirty = false;
    }
}


class CategoricalCard extends MetadataCard{
    constructor(view_tag, min_height, max_height, width, metadata){
        super(view_tag, min_height, max_height, width, metadata);

        /**
         * Organize draw data
         */
        this._array_distro = [];

        this._max_freq = Number.MIN_SAFE_INTEGER;

        for (let key of Object.keys(metadata.distribution)){
            this._max_freq = Math.max(metadata.distribution[key],this._max_freq);
            this._array_distro.push({'text': key, 'freq': metadata.distribution[key]})
        }

        /**
         * Data Setup
         */
        this._max_renderable_elements = 4;
        this._max_renderable_elements_y = 2;
        this._max_renderable_elements_x = Math.ceil(this._max_renderable_elements/this._max_renderable_elements_y);
        this._render_data = this._array_distro.sort((a,b)=>{return b.freq-a.freq}).slice(0,this._max_renderable_elements);
    
        /**
         * Layout Vars for Vis
         */
        this._bottom_axis_margin = 30;
        this._bar_right_margin = 20;
        this._bar_areas_height = this._expanded_vis_height - this._bottom_axis_margin;
        this._bar_row_height = this._bar_areas_height/this._array_distro.length;
        this._bar_label_width = 80;
        this._bar_label_marign = 5;
        this._bar_width = this._expanded_vis_width - this._bar_label_width - this._bar_right_margin;

        /**
         * Scales
         */
        this._x_layout_scale = d3.scaleLinear().domain([0,2]).range([0, this._spark_vis_width]);
        this._y_layout_scale = d3.scaleLinear().domain([0,2]).range([0, this._spark_vis_height]);
        this._opacity_scale = d3.scaleLinear().domain([this._render_data[0].freq, this._render_data[(this._render_data.length-1)].freq]).range([1, 0.25])


        this._bar_row_scale = d3.scaleLinear().domain([0,this._array_distro.length]).range([0, this._bar_areas_height]);
        this._bar_length_scale = d3.scaleLinear().domain([0, this._max_freq]).range([0, this._bar_width]);
        

        this.view_init();
    } 

    view_init(){      
        let x_axis = d3.axisBottom(this._bar_length_scale);

        this._expanded_vis.append("g")
            .attr('class', 'expanded-vis-bottom-axis')
            .attr("transform", `translate(${this._bar_label_width},${this._bar_areas_height})`)
            .call(x_axis);

        
        this._tooltip = this._expanded_vis
                            .append("div")
                            .attr("class", "tool-tip");
    }

    render(){
        const self = this;
        super.render();


        this._spark_vis.selectAll('.category')
                        .data(this._render_data)
                        .join(
                            (enter)=>{
                                enter.append('text')
                                        .text((d)=>{
                                            if(d.text === ""){
                                                return "[none]"
                                            }
                                            return this.truncate_string(d.text, 8);
                                        })
                                        .attr('dominant-baseline', 'hanging')
                                        .attr('class', 'category')
                                        .attr('font-family', 'monospace')
                                        .attr('x', (_,i)=>this._x_layout_scale(i%this._max_renderable_elements_x))
                                        .attr('y', (_,i)=>this._y_layout_scale(Math.floor(i/this._max_renderable_elements_y)))
                                        .attr('opacity', (d)=>this._opacity_scale(d.freq));
                            }
                        )

        this._expanded_vis.selectAll('.bar-row')
                            .data(this._array_distro)
                            .join(
                                (enter)=>{
                                    let bar_row = enter.append('g')
                                                        .attr('class', 'bar-row')
                                                        .attr('transform', (d,i)=>{return `translate(${0},${this._bar_row_scale(i)})`});

                                    bar_row.append('text')
                                            .text((d)=>{
                                                    if(d.text === ""){
                                                        return "[none]"
                                                    }
                                                    return this.truncate_string(d.text, 8);
                                                })
                                            .attr('dominant-baseline', 'central')
                                            .attr('font-family', 'monospace')
                                            .attr('text-anchor', 'end')
                                            .attr('x', this._bar_label_width - this._bar_label_marign)
                                            .attr('y', this._bar_row_height/2);

                                    bar_row.append('rect')
                                            .attr('x', this._bar_label_width)
                                            .attr('width', (d)=>{return this._bar_length_scale(d.freq)})
                                            .attr('height', this._bar_row_height)
                                            .attr('fill', 'rgb(50,50,100)');
                                }
                            )

    }
}

class OrdinalCard extends MetadataCard{
    constructor(view_tag, min_height, max_height, width, metadata){
        super(view_tag, min_height, max_height, width, metadata);
        
        /**
         * Organize draw data
         */
        this._array_distro = [];
        this._max_freq = Number.MIN_SAFE_INTEGER;

        for (let key of Object.keys(metadata.distribution)){
            this._max_freq = Math.max(metadata.distribution[key],this._max_freq);
            this._array_distro.push({'key': key, 'freq': metadata.distribution[key]})
        }

        console.log(this._array_distro);


        /**
         * Layout Vars
        */
        this._bar_area_margin = 10;
        this._bar_area_width = this._spark_vis_width-(this._bar_area_margin*2);

        this._bar_max_width = 45;
        this._bar_width = Math.min(this._bar_max_width, this._bar_area_width / this._array_distro.length);

        /**
         * Scales
        */
       this._bar_x_scale = d3.scaleLinear().domain([0, this._array_distro.length]).range([0,this._bar_area_width]);
       this._bar_height_scale = d3.scaleLinear().domain([0, this._max_freq]).range([0,this._spark_vis_height]);

        /**
         * Text to either side of bars
        */
       
        this._bar_area =  this._spark_vis.append('g')
                                        .attr('class', 'bar-grp')
                                        .attr('transform', `translate(${this._bar_area_margin},${0})`);

        // this._label_left = this._spark_vis.append('g')
        //                                 .attr('class', 'label-left-grp')
        //                                 .attr('transform', `translate(${this._bar_x_scale(0)},${0})`);
        
        // this._label_left.append('text')
        //                 .text(this.truncate_string(this._array_distro[0].key, 3))
        //                 .attr('class','label-left')
        //                 // .attr('fill', 'white')
        //                 .attr('font-family', 'monospace')
        //                 .attr('font-size', '.9em')
        //                 .attr('x', 0)
        //                 .attr('y', this._spark_vis_height-this._bar_height_scale(this._array_distro[0].freq));
        

        // this._label_right = this._spark_vis.append('g')
        //                 .attr('class', 'label-right-grp')
        //                 .attr('transform', `translate(${this._bar_x_scale(this._array_distro.length-1)},${0})`);

        // this._label_right.append('text')
        //         .text(this.truncate_string(this._array_distro[this._array_distro.length-1].key, 3))
        //         .attr('class','label-right')
        //         .attr('font-family', 'monospace')
        //         .attr('font-size', '.9em')
        //         .attr('x', 0)
        //         .attr('y', this._spark_vis_height-this._bar_height_scale(this._array_distro[this._array_distro.length-1].freq));


        
    }

    render(){
        super.render();

        this._bar_area
            .selectAll('.spark-bar')
            .data(this._array_distro)
            .join(
                (enter)=>{
                    enter
                    .append('rect')
                    .attr('class','spark-bar')
                    .attr('width',this._bar_width)
                    .attr('height', (d)=>this._bar_height_scale(d.freq))
                    .attr('x', (_, i)=>{
                        return this._bar_x_scale(i);
                    })
                    .attr('y', (d)=>{
                        return this._spark_vis_height-this._bar_height_scale(d.freq);
                    })
                    .attr('fill', 'rgb(50,50,100)');

                }   
            );

            
    }
}

class ContiniousCard extends MetadataCard{
    constructor(view_tag, min_height, max_height, width, metadata){
        super(view_tag, min_height, max_height, width, metadata);
        console.log("continious", metadata);


        /**
         * Get necessary data for drawing a 1d distribution
        */
        this._min_val = metadata.min;
        this._max_val = metadata.max;
        this._raw_vals = [];
        for(let v of metadata.values){
            this._raw_vals.push(v.value);
        }

        this._raw_vals = this._raw_vals.sort((a,b)=>a-b);
        console.log(this._raw_vals);
        this._quartiles = [
            d3.quantile(this._raw_vals, .25), 
            d3.quantile(this._raw_vals, .5), 
            d3.quantile(this._raw_vals, .75)
        ];

        console.log(this._min_val, this._quartiles, this._max_val);

        /**
         * Layout vars
        */
        this._boxplot_margin = 10;
        this._boxplot_area_width = this._spark_vis_width-(this._boxplot_margin*2);

        /**
         * Scales
         */
        this._boxplot_x_scale = d3.scaleLinear().domain([this._min_val, this._max_val]).range([0, this._boxplot_area_width]);

        /**
         * Make drawing order groups
        */
        this._boxplot_area = this._spark_vis.append('g')
                                            .attr('class', 'boxplot-area')
                                            .attr('transform', `translate(${this._boxplot_margin},${0})`)

        this._whisker_line = this._boxplot_area.append('path');
        this._left_whisker = this._boxplot_area.append('path');
        this._right_whisker = this._boxplot_area.append('path');
        this._box = this._boxplot_area.append('rect');
        this._midline = this._boxplot_area.append('path');



    }

    render(){
        const self = this;
        super.render();

        let boxplot_width = this._boxplot_x_scale(this._quartiles[2]) - this._boxplot_x_scale(this._quartiles[0]);

        this._whisker_line
            .attr('d',`M${this._boxplot_x_scale(this._min_val)},${this._spark_vis_height/2}L${this._boxplot_x_scale(this._max_val)},${this._spark_vis_height/2}`)
            .attr('stroke', 'black');

        this._left_whisker
            .attr('d',`M${this._boxplot_x_scale(this._min_val)},${0}L${this._boxplot_x_scale(this._min_val)},${this._spark_vis_height}`)
            .attr('stroke', 'black');

        this._right_whisker
            .attr('d',`M${this._boxplot_x_scale(this._max_val)},${0}L${this._boxplot_x_scale(this._max_val)},${this._spark_vis_height}`)
            .attr('stroke', 'black');

        this._box
            .attr('height', this._spark_vis_height)
            .attr('width', boxplot_width)
            .attr('x', this._boxplot_x_scale(this._quartiles[0]))
            .style('stroke', 'black')
            .style('stroke-width', '1px')
            .attr('fill', 'white');

        this._midline
            .attr('d',`M${this._boxplot_x_scale(this._quartiles[1])},${0}L${this._boxplot_x_scale(this._quartiles[1])},${this._spark_vis_height}`)
            .attr('stroke', 'black');

        
    }
}



//get data in initial step and pass to ami class in an agnostic way
export class AdvancedMetadataInterface{
    constructor(view_tag = null, width = 300, ensemble_metadata = []){
        /**
         * Data Variables
         */
        this._ensem_metadata = ensemble_metadata.filter(d=> d.type[0] !== 'complex');
        
        /**
         * Layout Specifications
         */
        this._view = view_tag;
        this._width = width;
        this._inital_binding_flag = true;
        this._expanded_indicies = [];
    }

    set_view_tag(vt){
        this._view = vt;
    }

    set_metadata(ensemble_metadata){
        this._ensem_metadata = ensemble_metadata.filter(d=> d.type[0] !== 'complex');
        this.maintain_scales();
    }

    maintain_scales(){
        this._card_list_scale = d3.scaleLinear().domain([0,this._ensem_metadata.length]).range([0, this._card_group_height]);
    }

    expansion_offset_scale(i){
        return this._expanded_indicies.filter((d)=>{return d<i}).length*(this._expanded_card_height-this._card_height);
    }

    update_expansion_indicies(){
        this._expanded_indicies = [];
        let ordered_names = this._ensem_metadata.map(e=>e.name);
        for(let n of $vis_state.expanded){
            const idx = ordered_names.indexOf(n);
            if(idx > -1){
                this._expanded_indicies.push(idx)
            }
        }
    }

    update_view_heights(){
        let collapsed_len = this._ensem_metadata.length - $vis_state.expanded.length;
        this._card_group_height = (this._card_height+this._card_bottom_margin) * collapsed_len + (this._expanded_card_height+this._card_bottom_margin) * $vis_state.expanded.length;
        this._field_height = this._card_group_height + 2*this._field_inner_margin;
        this._svg_height = this._field_height+(this._field_outer_margin*2);
    }


    data_init(){

        this._max_height = 500;
        //main svg & fields
        this._default_height = 100;
        this._svg_height = null;
        this._field_outer_margin = 4;
        this._field_inner_margin = 8;
        this._field_width = this._width - 2*this._field_outer_margin;

        //cards and card group
        this._card_height = 40;
        this._expanded_card_height = 200;
        this._card_bottom_margin = 4;
        this._card_group_width = this._field_width - this._field_inner_margin*2;
        this._card_group_height = (this._card_height+this._card_bottom_margin) * this._ensem_metadata.length;
        
        //calculate hour heights based on inner contents
        this._field_height = this._card_group_height + 2*this._field_inner_margin;
        this._svg_height = this._field_height+(this._field_outer_margin*2);
        
        if(this._ensem_metadata){
            this._metadata_cards = new Array(this._ensem_metadata.length);
            //scales
            this.maintain_scales();
        }
    }

    view_init(){
        this._view.style('width', this._width+10+'px')
                .style('max-height', '500px')
                .style('overflow', 'scroll');

        this._svg = this._view
                        .append('svg')
                        .attr('width', this._width)
                        .attr('height', this._svg_height || this._default_height)
                        .style('border', '1px solid black');

        this._field_grp = this._svg.append('g')
                                    .attr('id', 'field')
                                    .attr('width', this._field_width)
                                    .attr('height', this._field_height)
                                    .attr('transform', `translate(${this._field_outer_margin},${this._field_outer_margin})`);
        this._field_grp.append('rect')
                    .attr('width', this._field_width)
                    .attr('height', this._field_height)
                    .attr('fill', 'rgb(215,215,225)');
        //calculate new card group height
        
        this._card_list = this._field_grp
                            .append('g')
                            .attr('id', 'card_list')
                            .attr('height', this._card_group_height)
                            .attr('width', this._card_group_width)
                            .attr('transform', `translate(${this._field_inner_margin},${this._field_inner_margin})`);
    }

    render(){
        const self = this;

        console.log("Render is called");
        // console.log(this._ensem_metadata);

        //update data changes
        this.update_view_heights();
        this.update_expansion_indicies();



        //update view heights
        this._svg.attr('height', this._svg_height);
        this._field_grp.attr('height', this._field_height);
        this._field_grp.select('rect').attr('height', this._field_height);
        this._card_list.attr('height', this._card_group_height);

        //make and update cards
        this._card_list.selectAll('.cards')
                        .data(this._ensem_metadata)
                        .join(
                            (enter) => {
                                let card_area = enter.append('g')
                                                    .attr('class', 'cards')
                                                    .attr('height', this._card_height)
                                                    .attr('width', this._card_group_width)
                                                    .attr('transform', (d,i)=>{return `translate(${0}, ${this._card_list_scale(i)})`});

                                //intialize the card objects
                                card_area.each(function(d,i){
                                    if(d.type[0] == "categorical" && d.type[1] == "qualitative"){
                                        self._metadata_cards[i] = new CategoricalCard(this, self._card_height, self._expanded_card_height, self._card_group_width, d);
                                    }
                                    else if(d.type[0] == "categorical" && d.type[1] == "quantitative"){
                                        self._metadata_cards[i] = new OrdinalCard(this, self._card_height, self._expanded_card_height, self._card_group_width, d);
                                    }
                                    else if(d.type[0] == "continious" && d.type[1] == "quantitative"){
                                        self._metadata_cards[i] = new ContiniousCard(this, self._card_height, self._expanded_card_height, self._card_group_width, d);
                                    }
                                    else{
                                        console.warn("This metadata type is not yet supported.", d);
                                    }
                                })

                                return enter;       
                            },
                            (update) => {
                                update.attr('transform', (d,i)=>{return `translate(${0}, ${this._card_list_scale(i) + this.expansion_offset_scale(i)})`});
                            }
                        );
        


        //update cards
        let render_cards = self._metadata_cards.filter((mc)=>{
            return mc.dirty || $vis_state.expanded.includes(mc.name);
        });

        for(let c of render_cards){
            c.render();
        }
    }

    /**
     * A render that doesn't run the actual render function
     * when loaded in as a dynamic function when vis state
     * updates
     */
    safe_render(){
        if(this._inital_binding_flag)
            this._inital_binding_flag = false;
        else
            this.render();
    }
            
}


let width = 400;
let ami = new AdvancedMetadataInterface(null, width);  


$: $vis_state, ami.safe_render();


onMount(()=>{
    d3.json("user_ensemble.json")
    .then(function (data){  
        let metadata_lists = [];

        /**
         * Transform metadata into an array of arrays of metadata values
         * with each element in the values array indexed b
         */
        for(let key of Object.keys(data.metadata[0])){
            if (key != 'profile'){
                let md_overview = {};

                md_overview['name'] = key;
                md_overview['values'] = [];

                for(let profile of data.metadata){
                    md_overview['values'].push({'profile':profile.profile, 'value':profile[key]});
                }

                
                md_overview['type'] = data_categorizer(md_overview);
                affix_sd_and_var_to_data(md_overview);

                metadata_lists.push(md_overview);
            }
            
        }

        metadata_lists = metadata_lists.sort((a,b)=>{return b.var-a.var});

        ami.set_metadata(metadata_lists);
        ami.data_init();

        ami.set_view_tag(d3.select('#view'));
        ami.view_init();

        console.log("pre-render");
        ami.render();

    });
})

</script>


<!-- Container for the visualization -->
<div id="view"></div>