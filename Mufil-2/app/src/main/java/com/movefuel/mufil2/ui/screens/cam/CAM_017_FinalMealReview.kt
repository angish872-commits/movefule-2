package com.movefuel.mufil2.ui.screens.cam

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun CAM017FinalMealReviewScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "CAM_017",
        title = "Final Meal Review",
        subtitle = "Food photo and gallery analysis with explicit review.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.CAM_018,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.CAM_016,
        onNavigate = onNavigate,
    ) {
            MFMediaPanel("Meal photo", "Review before creating canonical food facts.")
            MFListItem("Detected meal draft", "Estimated portions remain editable and unconfirmed", "Review")
            MFNotice("Explicit confirmation required", "Camera output remains a draft until the shared food confirmation boundary is committed.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun CAM017FinalMealReviewScreenPreview() {
    MoveFuelTheme { CAM017FinalMealReviewScreen {} }
}
