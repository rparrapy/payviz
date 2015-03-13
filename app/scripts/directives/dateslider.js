'use strict';

/**
 * @ngdoc directive
 * @name payvizApp.directive:dateSlider
 * @description
 * # dateSlider
 */
angular.module('payvizApp')
  .directive('dateSlider', function () {
    return {
      restrict: 'E',
      replace: false,
      scope: { until: '=' },
      template: '<div id="fecha"></div>',
      link: function postLink(scope, element, attrs) {
        var timestamp = function(str){
          return +moment(str, 'YYYYMMDD');   
        }

        var limits = ['20071130', '20150331'];

        $("#fecha").noUiSlider({
        // Create two timestamps to define a range.
            range: {
                min: timestamp(limits[0]),
                max: timestamp(limits[1])
            },
          
        // Steps of one week
            //step: 7 * 24 * 60 * 60 * 1000,
          
        // Two more timestamps indicate the handle starting positions.
            start: [ timestamp(limits[1]) ],
          
        // No decimals
          format: wNumb({
            decimals: 0
          })
        });

        $("#fecha").on({
          slide: function(){
            scope.$apply(function(){ 
              var ts = parseInt($('#fecha').val());
              scope.until = moment(ts);
            });
          }
        });

        $('#fecha').noUiSlider_pips({
          mode: 'values',
          values: [timestamp(limits[0]), timestamp('20090101'), timestamp('20100101'),
                    timestamp('20110101'), timestamp('20120101'), timestamp('20130101'), timestamp('20140101'), timestamp(limits[1])],
          density: 4
        });

        $('.noUi-value').each(function(){
          var ts = parseInt($(this).text());
          var label;
          var limitTimestamps = _.map(limits, function(l){ return timestamp(l); });
          if(_.contains(limitTimestamps, ts)){
            label = moment(ts).format('L');
          }else{
            label = moment(ts).year();
          }
          $(this).text(label);
        });
      }
    };
  });
