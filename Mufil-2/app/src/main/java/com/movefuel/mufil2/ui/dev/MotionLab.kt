package com.movefuel.mufil2.ui.dev

import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.*

@Composable
fun MotionLab() {
    MFPremiumBackground {
        Column(
            Modifier
                .fillMaxSize()
                .padding(MoveFuelSpacing.Base),
            verticalArrangement = Arrangement.spacedBy(MoveFuelSpacing.Base),
        ) {
            Text("MoveFuel Motion Lab", color = MoveFuelColors.Text)
            Row(horizontalArrangement = Arrangement.spacedBy(MoveFuelSpacing.Md)) {
                MFMetricRing(.78f, "78%")
                MFMetricRing(.62f, "62%", MoveFuelColors.Info)
                MFMetricRing(.45f, "45%", MoveFuelColors.FuelAccent)
            }
            MFMediaLoading("Buffering exercise media…")
            MFStageList(
                stages = listOf(
                    "Queued",
                    "Reading source",
                    "Extracting recipe",
                    "Matching foods",
                    "Preparing review",
                ),
                activeIndex = 2,
            )
            MFSkeleton(300.dp, 22.dp)
            MFSkeleton(220.dp, 14.dp)
        }
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun MotionLabPreview() = MoveFuelTheme { MotionLab() }
