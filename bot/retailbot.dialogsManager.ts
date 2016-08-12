var builder = require('botbuilder');
var fs      = require('fs');

export namespace RETAILBOT {
    export class DialogsManager{

        private _luismodel: string;
        private _recognizer: any; //to be fixed later...
        private _dialog: any; // samehere...
        private _criteria: any;

        constructor(){
            this._luismodel = 'https://api.projectoxford.ai/luis/v1/application?id=4003e415-34e6-4ed1-94e5-bcd41f3d166a&subscription-key=0784951bd65d4b3cac6a0fa67d320b9f'; 
            this._recognizer = new builder.LuisRecognizer(this._luismodel);
            this._dialog = new builder.IntentDialog({ recognizers: [this._recognizer] });
            this._criteria = JSON.parse(fs.readFileSync('data/criteria.json'));
        }

        protected criteria (session: any, results: any): void {
            var missing_criteria: any[] = [];
            for (var key in session.userData.laptop) {
                if (session.userData.laptop[key] == null) {
                    missing_criteria.push(key);
                }
            }
                        
            if (missing_criteria.length) {
                console.log('CALLING : ' + missing_criteria[0]);
                session.beginDialog('/' + missing_criteria[0]);
            } else {
                session.send(JSON.stringify(session.userData.laptop));
                session.endDialog();
            }
        }

        protected set_dialogs(bot: any) :void {
            for (var c of this._criteria) {
                var that = this;
                var criteria:any = [
                    function(session: any) {
                        builder.Prompts[this.criteria["type"]](session, this.criteria["question"], ((this.criteria["choices"]) ? this.criteria["choices"] : null ));
                    }, function(session: any, results: any) {
                        if (this.criteria["type"] == "text") {
                            session.userData.laptop[this.criteria["name"]] = results.response;
                        } else if (this.criteria["type"] == "choice") {
                            session.userData.laptop[this.criteria["name"]] = results.response.entity;   
                        }
                        that.criteria(session, results);
                    }
                ];
                
                criteria.criteria  = c;
                bot.dialog('/' + c["name"], criteria); 
            }
        }

        public init(bot: any) {
            bot.dialog('/', this._dialog);

            this._dialog.onDefault(builder.DialogAction.send("I'm sorry I didn't understand."));

            this._dialog.matches('BuyPC', [
                 (session: any, args: any, next: any) => {
                    var brand = builder.EntityRecognizer.findEntity(args.entities, 'PcBrand');
                    var type = builder.EntityRecognizer.findEntity(args.entities, 'PcType');
                    var price: any = {
                        'price' :  builder.EntityRecognizer.findEntity(args.entities, 'PcPrice'),
                        'startPrice' : builder.EntityRecognizer.findEntity(args.entities, 'PcPrice::startPrice'),
                        'endPrice' : builder.EntityRecognizer.findEntity(args.entities, 'PcPrice::endPrice')
                    };
                    
                    var cam: any = null;
                    
                    if (builder.EntityRecognizer.findEntity(args.entities, 'PcCam::With')) {
                        cam = true;
                    } else if (builder.EntityRecognizer.findEntity(args.entities, 'PcCam::Without')) {
                        cam = false;
                    }
                    
                    var got_price: any = null;
                    
                    for (var key in price) {
                        if (price[key]) {
                            got_price = true;
                            price[key] = price[key].entity;
                        }
                    }
                    
                    session.userData.laptop = {
                        brand: brand ? brand.entity : null,
                        type: type ? type.entity : null,
                        price: got_price ? price : null,
                        cam: cam
                    };
                                        
                    next();
                },
                this.criteria
            ]);
            
            this.set_dialogs(bot);

            this._dialog.matches('Hello', [
                (session: any, args: any, next: any) => {
                    session.send('Hello ! What can i do for you ?');
                }
            ]);
        }
    }    
}