﻿// QOpenEnded View
// ===============

define(["jquery", "backbone", "models/Models", "text!templates/QOpenEndedTemplate.html"],
    function ($, Backbone, Models, QOpenEndedTemplate) {

    var QOpenEndedView = Backbone.View.extend({

        el: "#question .main-content",

        template: QOpenEndedTemplate,

        events: {
            "click #qOpenEndedQuestionDelete": "deleteQuestion_ONCLICK",
        },

        initialize: function() {


        },

        render: function (model) {
          
            //render view here

            var self = this;

            var tmpl = _.template(this.template, model.toJSON());

            this.$el.html(tmpl);

            // order logic for drop down
            $("#qOpenEndedQuestionOrder").html("<option value='-2'>No Order Change</option><option value='-1'>Make this question first</option>");
            App.questionCollection.each(function (model, i) {
                var num = i + 1;
                $("#qOpenEndedQuestionOrder").append("<option value='" + model.get("id") + "'>" + num + ".) " + model.get("question") + "</option>");
            }, this);
            $("#qOpenEndedQuestionOrder").append("<option value='-3'>Make this question last</option>");


            $("#question").trigger("create");

            $("#qOpenEndedQuestionSave").on("click", {self: self }, this.save_ONCLICK);
          
            return this;

        },

        save_ONCLICK: function(e) {
           
            // save to the global  App.questionCollection

            var self = e.data.self;

            var q = $("#qOpenEndedQuestionInput").val();

            var model = App.questionCollection.get(App.questionId);

            // order logic passed to server,  -1= first, -2= no change, -3=last
            // anything else is the questionId the current question should go after
            var order = $("#qOpenEndedQuestionOrder").val();

            
            model.save({
                question: q,
                File: null,
                order: order
            }, {

                wait: true,

                success: function (data, textStatus, jqXHR) {
                    // nav to #question/qid page
                    App.router.navigate("file?" + App.fileId, { trigger: true });

                },
                error: function (jqXHR, textStatus, errorThrown) {
                    alert("Error - " + textStatus.statusText);
                }

            });

        },

        deleteQuestion_ONCLICK: function () {

            var model = App.questionCollection.get(App.questionId);

            // re-orders questions, deletes questions, and deletes any repsonse answers dependencies
            var answer = confirm("Are you sure you want to delete this questions? It will also delete the answers from anybody who already answered this question.");
            if (answer) {
                model.destroy({

                    wait: true,

                    success: function (data, textStatus, jqXHR) {
                        // nav to #question/qid page
                        App.router.navigate("file?" + App.fileId, { trigger: true });

                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        alert("Error - " + textStatus.statusText);
                    }

                });
            }
           
        },


        dispose: function () {

            //console.log("dispose called");

            this.model.clear();

            $("#qOpenEndedQuestionSave").off("click");

        }

    });

    return QOpenEndedView;

});
