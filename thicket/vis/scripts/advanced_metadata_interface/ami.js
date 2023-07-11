import * as d3 from 'd3';

//get data in initial step and pass to ami class in an agnostic way
export class AMI{
    constructor(view_tag, width, ensemble_data){
        this.view = view_tag;
        this.width = width;
        this.data = ensemble_data;

    }

    render(){
        const self = this;
        console.log("Rendering :D")
    }
}

function main(){


    console.log("working");

    let width = 500;
    d3.json("user_ensemble.json", (data) => {  

        console.log(data);
        // console.log("working");
        // let ami = new AMI(d3.select("#view"), width, data);  

        // ami.render();

    })
}

main();