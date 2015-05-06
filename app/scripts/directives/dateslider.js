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
      scope: { until: '=', lastUpdated: '=' },
      template: '<div id="fecha"></div>',
      link: function postLink(scope, element, attrs) {
        var timestamp = function(str){
          return +moment(str, 'YYYYMMDD');   
        }

        var upperLimit = scope.lastUpdated ? scope.lastUpdated.format('YYYYMMDD') : '20150430';
        var limits = ['20071130', upperLimit];

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

        var lastYear = moment(upperLimit, 'YYYYMMDD').year();
        //var secondHalfYear = moment(upperLimit, 'YYYYMMDD').subtract(6, 'months').year() === lastYear;
        var afterApril = moment(upperLimit, 'YYYYMMDD').subtract(4, 'months').year() === lastYear;
        var yearRange = afterApril ? _.range(2009, lastYear + 1) : _.range(2009, lastYear);
        var pipValues = [timestamp(limits[0])];
        pipValues = pipValues.concat(_.map(yearRange, function(y){ return timestamp(y + '0101'); }));
        pipValues.push(timestamp(limits[1]));

        $('#fecha').noUiSlider_pips({
          mode: 'values',
          values: pipValues,
          density: 4
        });

        $('.noUi-value').each(function(){
          var ts = parseInt($(this).text());
          var label;
          var limitTimestamps = _.map(limits, function(l){ return timestamp(l); });
          if(_.contains(limitTimestamps, ts)){
            label = moment(ts).format('L');
            if(ts === limitTimestamps[1] && afterApril) label = label.substring(0, label.length - 5);
          }else{
            label = moment(ts).year();
          }
          $(this).text(label);
        });
      }
    };
  });
